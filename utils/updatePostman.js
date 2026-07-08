const fs = require('fs');
const path = require('path');

const collectionPath = path.join(__dirname, '../Swarna_Bindu_Gold_Scheme_API.postman_collection.json');
const collection = JSON.parse(fs.readFileSync(collectionPath, 'utf8'));

// 1. Define client compliance folder
const clientComplianceFolder = {
  name: "Compliance & DPDP Rights",
  description: "DPDP Act, 2023 rights management (consents logging, data portability download, erasure, and grievances).",
  item: [
    {
      name: "1. Public Data Fiduciary Contact",
      request: {
        method: "GET",
        header: [],
        url: {
          raw: "{{baseUrl}}/compliance/contact",
          host: ["{{baseUrl}}"],
          path: ["compliance", "contact"]
        }
      }
    },
    {
      name: "2. Get Consents History",
      request: {
        method: "GET",
        header: [{ key: "Authorization", value: "Bearer {{clientToken}}" }],
        url: {
          raw: "{{baseUrl}}/compliance/consent",
          host: ["{{baseUrl}}"],
          path: ["compliance", "consent"]
        }
      }
    },
    {
      name: "3. Log Consent Agreement",
      request: {
        method: "POST",
        header: [{ key: "Authorization", value: "Bearer {{clientToken}}" }],
        body: {
          mode: "raw",
          raw: JSON.stringify({
            consentType: "KYC",
            purpose: "Identity verification for gold savings scheme",
            consentText: "I hereby authorize Swarna Bindu to verify my offline e-KYC uploads."
          }, null, 2),
          options: { raw: { language: "json" } }
        },
        url: {
          raw: "{{baseUrl}}/compliance/consent",
          host: ["{{baseUrl}}"],
          path: ["compliance", "consent"]
        }
      }
    },
    {
      name: "4. Withdraw Consent",
      request: {
        method: "DELETE",
        header: [{ key: "Authorization", value: "Bearer {{clientToken}}" }],
        url: {
          raw: "{{baseUrl}}/compliance/consent/KYC",
          host: ["{{baseUrl}}"],
          path: ["compliance", "consent", "KYC"]
        }
      }
    },
    {
      name: "5. Export Personal Data (Portability)",
      request: {
        method: "GET",
        header: [{ key: "Authorization", value: "Bearer {{clientToken}}" }],
        url: {
          raw: "{{baseUrl}}/compliance/data-portability",
          host: ["{{baseUrl}}"],
          path: ["compliance", "data-portability"]
        }
      }
    },
    {
      name: "6. Request Data Erasure",
      request: {
        method: "POST",
        header: [{ key: "Authorization", value: "Bearer {{clientToken}}" }],
        url: {
          raw: "{{baseUrl}}/compliance/data-erasure",
          host: ["{{baseUrl}}"],
          path: ["compliance", "data-erasure"]
        }
      }
    },
    {
      name: "7. Submit Grievance Ticket",
      request: {
        method: "POST",
        header: [{ key: "Authorization", value: "Bearer {{clientToken}}" }],
        body: {
          mode: "raw",
          raw: JSON.stringify({
            subject: "Aadhaar upload issue",
            description: "The selfie upload times out on my mobile screen."
          }, null, 2),
          options: { raw: { language: "json" } }
        },
        url: {
          raw: "{{baseUrl}}/compliance/grievance",
          host: ["{{baseUrl}}"],
          path: ["compliance", "grievance"]
        }
      }
    },
    {
      name: "8. Get My Grievance Tickets",
      request: {
        method: "GET",
        header: [{ key: "Authorization", value: "Bearer {{clientToken}}" }],
        url: {
          raw: "{{baseUrl}}/compliance/grievance",
          host: ["{{baseUrl}}"],
          path: ["compliance", "grievance"]
        }
      }
    }
  ]
};

// 2. Define admin compliance folder
const adminComplianceFolder = {
  name: "Regulatory Compliance",
  description: "Grievances administration, secure media delivery authorization pipeline, and CERT-In breach logs.",
  item: [
    {
      name: "1. Get Grievance Tickets list",
      request: {
        method: "GET",
        header: [{ key: "Authorization", value: "Bearer {{adminToken}}" }],
        url: {
          raw: "{{baseUrl}}/admin/compliance/grievance",
          host: ["{{baseUrl}}"],
          path: ["admin", "compliance", "grievance"]
        }
      }
    },
    {
      name: "2. Assign Grievance Ticket",
      request: {
        method: "PUT",
        header: [{ key: "Authorization", value: "Bearer {{adminToken}}" }],
        body: {
          mode: "raw",
          raw: JSON.stringify({
            adminId: "seeded_admin_id"
          }, null, 2),
          options: { raw: { language: "json" } }
        },
        url: {
          raw: "{{baseUrl}}/admin/compliance/grievance/:id/assign",
          host: ["{{baseUrl}}"],
          path: ["admin", "compliance", "grievance", ":id", "assign"],
          variable: [{ key: "id", value: "grievance_ticket_id" }]
        }
      }
    },
    {
      name: "3. Resolve Grievance Ticket",
      request: {
        method: "PUT",
        header: [{ key: "Authorization", value: "Bearer {{adminToken}}" }],
        body: {
          mode: "raw",
          raw: JSON.stringify({
            resolutionNotes: "Re-encoded upload pipeline to prevent file compression timeouts."
          }, null, 2),
          options: { raw: { language: "json" } }
        },
        url: {
          raw: "{{baseUrl}}/admin/compliance/grievance/:id/resolve",
          host: ["{{baseUrl}}"],
          path: ["admin", "compliance", "grievance", ":id", "resolve"],
          variable: [{ key: "id", value: "grievance_ticket_id" }]
        }
      }
    },
    {
      name: "4. Secure Media Download Gateway",
      request: {
        method: "GET",
        header: [{ key: "Authorization", value: "Bearer {{adminToken}}" }],
        url: {
          raw: "{{baseUrl}}/admin/compliance/media/:userId/aadhaarFront",
          host: ["{{baseUrl}}"],
          path: ["admin", "compliance", "media", ":userId", "aadhaarFront"],
          variable: [{ key: "userId", value: "client_user_id" }]
        }
      }
    },
    {
      name: "5. Log Security Incident (Breach)",
      request: {
        method: "POST",
        header: [{ key: "Authorization", value: "Bearer {{adminToken}}" }],
        body: {
          mode: "raw",
          raw: JSON.stringify({
            title: "Unauthorized network access scans detected",
            description: "Security logs caught port probes targeting 27017.",
            severity: "MEDIUM",
            affectedComponents: ["Database Node 1"],
            estimatedImpactedUsers: 0,
            remediationSteps: "Refitted firewall filters to drop offending source IPs.",
            reportedToCertIn: false
          }, null, 2),
          options: { raw: { language: "json" } }
        },
        url: {
          raw: "{{baseUrl}}/admin/compliance/incidents/log",
          host: ["{{baseUrl}}"],
          path: ["admin", "compliance", "incidents", "log"]
        }
      }
    },
    {
      name: "6. Get Security Incident Logs",
      request: {
        method: "GET",
        header: [{ key: "Authorization", value: "Bearer {{adminToken}}" }],
        url: {
          raw: "{{baseUrl}}/admin/compliance/incidents",
          host: ["{{baseUrl}}"],
          path: ["admin", "compliance", "incidents"]
        }
      }
    }
  ]
};

const clientFlow = collection.item[0];
const adminFlow = collection.item[1];

const hasClientUpdate = clientFlow.item.some(i => i.name === "Compliance & DPDP Rights");
if (!hasClientUpdate) {
  clientFlow.item.push(clientComplianceFolder);
}

const hasAdminUpdate = adminFlow.item.some(i => i.name === "Regulatory Compliance");
if (!hasAdminUpdate) {
  adminFlow.item.push(adminComplianceFolder);
}

fs.writeFileSync(collectionPath, JSON.stringify(collection, null, 2), 'utf8');
console.log("Postman collection successfully updated with client & admin compliance routes!");
