#  Image Recognition with AWS Bedrock & Rekognition
An AI-powered image recognition application built using **Amazon Rekognition**, **Amazon Bedrock**, and a serverless AWS architecture. Users can upload images through a simple web interface and receive AI-generated descriptions and insights based on detected objects.

---

## Overview
This project demonstrates how to combine generative AI using AWS managed services.

## Features
- Uploads images securely to Amazon S3.
- Processes requests through Amazon API Gateway.
- Executes business logic in AWS Lambda.
- Detects objects and labels using Amazon Rekognition.
- Uses Amazon Bedrock foundation models to generate descriptions.
- Hosts the frontend using AWS Amplify with automated deployments through GitHub integration.

---

## 🏗 Architecture

```
                        +------------------+
                        |   AWS Amplify    |
                        |  Frontend (UI)   |
                        +--------+---------+
                                 |
                                 |
                                 ▼
                        +------------------+
                        |  API Gateway      |
                        +--------+---------+
                                 |
                                 ▼
                        +------------------+
                        | AWS Lambda        |
                        | Python 3.12       |
                        +--------+---------+
                                 |
                +----------------+----------------+
                |                                 |
                ▼                                 ▼
        +---------------+                 +------------------+
        | Amazon S3     |                 | Amazon Rekognition|
        | Image Storage |                 | Label Detection   |
        +---------------+                 +---------+---------+
                                                    |
                                                    ▼
                                          +------------------+
                                          | Amazon Bedrock   |
                                          | Foundation Model |
                                          +------------------+
                                                    |
                                                    ▼
                                           AI-Generated Response
```
---

## 🛠 Technologies Used as follows

### Frontend

- HTML5
- CSS3
- JavaScript

### Backend

- Python 3.12
- AWS Lambda

### AWS Services

- Amazon S3
- Amazon API Gateway
- AWS Lambda
- Amazon Rekognition
- Amazon Bedrock
- AWS Amplify
- Amazon CloudWatch
- AWS IAM

---

# Deployment Guide

## Step 1: Create an Amazon S3 Bucket
Create an S3 bucket with a globally unique name.

### Bucket configurations

- Block all public access.
- Enable versioning.
- Follow the principle of least privilege.

## Step 2: Enable Amazon Bedrock Model Access
Navigate to:

Amazon Bedrock
→ Model access
→ Manage model access
Request access to the desired foundation model.
---

## Step 3: Create IAM Role for Lambda function
Attach the following policies:

- AmazonS3FullAccess
- AmazonRekognitionReadOnlyAccess
- AmazonBedrockFullAccess
- AWSLambdaBasicExecutionRole
---

## Step 4: Create Lambda Function
Runtime: Python 3.12
Configure environment variables:

---

## Step 5: API Gateway

### Configure CORS
Enable:
Access-Control-Allow-Origin
Access-Control-Allow-Methods
Access-Control-Allow-Headers
```

## Integrate with Lambda Function
Create a REST API and connect it to the Lambda function.

### Create Deployment Stage
Example:
dev

Test the endpoint to verify connectivity.

---

## Step 6: Deploy Frontend with AWS Amplify
Connect Amplify to GitHub.

Each push to the repository automatically triggers:

1. Build
2. Deployment
3. Hosting
This provides a simple CI/CD pipeline for the frontend application.

---

# 📷 Screenshots

## User Interface
<img width="654" height="367" alt="Rekognition App Screenshot" src="https://github.com/user-attachments/assets/d01e45a7-cb4c-4ccb-9afd-1d48a2800532" />

---

## Amazon S3 Bucket Configuration
<img width="593" height="162" alt="s3 bucket screenshot" src="https://github.com/user-attachments/assets/4f2f985c-6604-4b73-b57b-56e4137868f2" />

---

## API Gateway Configuration
<img width="610" height="218" alt="API gateway screenshot" src="https://github.com/user-attachments/assets/74856bf1-d35c-4eaf-989c-f4962a5b7204" />

---

## AWS Amplify Deployment
<img width="594" height="194" alt="Aws AMplify" src="https://github.com/user-attachments/assets/6281ad9c-b597-4271-96dc-82724202a242" />

---

# Monitoring
Application metrics and logs are available through:

- Amazon CloudWatch Logs
- Lambda Metrics
- API Gateway Monitoring

---

# Author
**Edah Efemena Evans**

Cloud/DevOps Engineer

---

# License
Copyright © 2026 Edah Efemena Evans. All rights reserved. 

```

Copyright (c) 2026

