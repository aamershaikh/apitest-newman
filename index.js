const newman = require('newman');
const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');

// Set AWS region
AWS.config.update({ region: 'us-east-1' });

// Create S3 service object
const s3 = new AWS.S3();

// Load Postman collection from JSON file
const collection = require('./testcollection.json');

// Define handler function for AWS Lambda
exports.handler = async (event) => {
  return new Promise((resolve, reject) => {
    const reportPath = '/tmp/newman-report.html';

    newman.run(
      {
        collection: collection,
        reporters: ['htmlextra'],
        reporter: {
          htmlextra: {
            export: reportPath,
          },
        },
      },
      async (err) => {
        if (err) {
          reject(`Newman run failed: ${err}`);
        } else {
          try {
            // Read the generated HTML report
            const report = fs.readFileSync(reportPath);

            // Upload the report to S3
            const uploadParams = {
              Bucket: 'postman-reports-bucket', // replace with your bucket name
              Key: 'newman-report.html', // the name of the file in S3
              Body: report,
              ContentType: 'text/html'
            };

            await s3.upload(uploadParams).promise();

            // Generate a public URL for accessing the report
            const url = `https://${uploadParams.Bucket}.s3.amazonaws.com/${uploadParams.Key}`;

            resolve({
              statusCode: 200,
              body: JSON.stringify({ message: 'Report generated and uploaded to S3', url: url }),
              headers: {
                'Content-Type': 'application/json',
              },
            });
          } catch (uploadErr) {
            reject(`Failed to upload report to S3: ${uploadErr}`);
          }
        }
      }
    );
  });
};
