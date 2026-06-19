import json
import boto3
import base64
import uuid
import os
import logging
from botocore.exceptions import ClientError

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Initialize AWS clients
s3 = boto3.client("s3")
rekognition = boto3.client("rekognition")
bedrock = boto3.client("bedrock-runtime", region_name="us-east-1")

# Environment variable
BUCKET_NAME = os.environ["S3_BUCKET_NAME"]


def lambda_handler(event, context):
    logger.info("Received event: %s", json.dumps(event))

    # Handle CORS preflight — supports both REST API (v1) and HTTP API (v2)
    http_method = (
        event.get("httpMethod")  # REST API Gateway (v1)
        or event.get("requestContext", {}).get("http", {}).get("method", "")  # HTTP API (v2)
    )
    if http_method == "OPTIONS":
        return cors_preflight_response()

    try:
        body = parse_body(event)
        image_data = decode_image(body)

        # Generate a unique S3 key
        file_name = f"uploads/{uuid.uuid4()}.jpg"

        # Step 1: Store image in S3
        upload_to_s3(image_data, file_name)

        # Step 2: Detect labels with Rekognition
        labels = detect_labels(file_name)

        # Step 3: Generate description with Bedrock
        description = generate_description(labels)

        logger.info("Successfully processed image: %s", file_name)
        return success_response({
            "labels": labels,
            "description": description,
            "image_key": file_name
        })

    except ValueError as e:
        logger.warning("Validation error: %s", str(e))
        return error_response(400, str(e))
    except ClientError as e:
        error_code = e.response["Error"]["Code"]
        logger.error("AWS ClientError [%s]: %s", error_code, str(e))
        return error_response(502, f"AWS service error: {error_code}")
    except Exception as e:
        logger.error("Unexpected error: %s", str(e), exc_info=True)
        return error_response(500, "An unexpected error occurred. Please try again.")


# ──────────────────────────────────────────────
# Request Parsing
# ──────────────────────────────────────────────

def parse_body(event):
    """Extract and parse the JSON body from the API Gateway event."""
    raw_body = event.get("body")
    if not raw_body:
        raise ValueError("Request body is missing.")

    # API Gateway can base64-encode the body for binary payloads
    if event.get("isBase64Encoded"):
        raw_body = base64.b64decode(raw_body).decode("utf-8")

    try:
        return json.loads(raw_body)
    except json.JSONDecodeError:
        raise ValueError("Request body is not valid JSON.")


def decode_image(body):
    """Decode the base64 image string from the request body."""
    image_b64 = body.get("image")
    if not image_b64:
        raise ValueError("Missing 'image' field in request body.")
    try:
        return base64.b64decode(image_b64)
    except Exception:
        raise ValueError("Invalid base64 image data.")


# ──────────────────────────────────────────────
# S3
# ──────────────────────────────────────────────

def upload_to_s3(image_data, file_name):
    """Upload the decoded image bytes to S3."""
    logger.info("Uploading image to S3: %s", file_name)
    try:
        s3.put_object(
            Bucket=BUCKET_NAME,
            Key=file_name,
            Body=image_data,
            ContentType="image/jpeg"
        )
        logger.info("Image uploaded successfully.")
    except ClientError as e:
        logger.error("S3 upload failed: %s", str(e))
        raise


# ──────────────────────────────────────────────
# Rekognition
# ──────────────────────────────────────────────

def detect_labels(file_name):
    """Use Rekognition to detect labels in the uploaded S3 image."""
    logger.info("Running Rekognition on: %s", file_name)
    try:
        response = rekognition.detect_labels(
            Image={"S3Object": {"Bucket": BUCKET_NAME, "Name": file_name}},
            MaxLabels=10,
            MinConfidence=70
        )
    except ClientError as e:
        logger.error("Rekognition failed: %s", str(e))
        raise

    # FIX: return keys matching what app.js expects (Name, Confidence)
    labels = [
        {
            "Name": label["Name"],
            "Confidence": round(label["Confidence"], 2),
            "Categories": [c["Name"] for c in label.get("Categories", [])]
        }
        for label in response["Labels"]
    ]

    logger.info("Detected %d labels: %s", len(labels), [l["Name"] for l in labels])

    if not labels:
        raise ValueError("No recognizable content found in the image.")

    return labels


# ──────────────────────────────────────────────
# Bedrock
# ──────────────────────────────────────────────

def generate_description(labels):
    """Use Amazon Bedrock (Claude 3 Haiku) to generate a human-readable image description."""
    label_names = ", ".join([l["Name"] for l in labels])
    top_labels = labels[:5]

    prompt = (
        f"You are an image description assistant. "
        f"Based on the following labels detected in an image by an AI vision system: {label_names}. "
        f"The most prominent elements are: {', '.join([l['Name'] for l in top_labels])}. "
        f"Write a natural, friendly 2-3 sentence description of what this image likely shows. "
        f"Do not mention that you are using labels or AI detection — just describe the scene naturally."
    )

    logger.info("Calling Bedrock with labels: %s", label_names)
    try:
        response = bedrock.invoke_model(
            modelId="us.anthropic.claude-3-5-haiku-20241022-v1:0",
            contentType="application/json",
            accept="application/json",
            body=json.dumps({
                "anthropic_version": "bedrock-2023-05-31",
                "max_tokens": 300,
                "temperature": 0.7,
                "messages": [{"role": "user", "content": prompt}]
            })
        )
    except ClientError as e:
        logger.error("Bedrock invocation failed: %s", str(e))
        raise

    result = json.loads(response["body"].read())
    description = result["content"][0]["text"].strip()
    logger.info("Generated description: %s", description)
    return description


# ──────────────────────────────────────────────
# Response Helpers
# ──────────────────────────────────────────────

def success_response(data):
    return {
        "statusCode": 200,
        "headers": cors_headers(),
        "body": json.dumps(data)
    }


def error_response(status_code, message):
    return {
        "statusCode": status_code,
        "headers": cors_headers(),
        "body": json.dumps({"message": message})
    }


def cors_preflight_response():
    return {
        "statusCode": 200,
        "headers": cors_headers(),
        "body": ""
    }


def cors_headers():
    return {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS"
    }
