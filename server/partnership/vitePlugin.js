import { createPartnershipInquiryHandler } from "./service.js";

function createResponseAdapter(response) {
  return {
    setHeader:(name, value) => response.setHeader(name, value),
    status(statusCode) {
      response.statusCode = statusCode;
      return this;
    },
    json(payload) {
      response.end(JSON.stringify(payload));
      return payload;
    },
  };
}

export function partnershipInquiryDevApi() {
  const handler = createPartnershipInquiryHandler();
  return {
    name:"altair-partnership-inquiry-dev-api",
    configureServer(server) {
      server.middlewares.use("/api/partnership-inquiry", async (request, response) => {
        await handler(request, createResponseAdapter(response));
      });
    },
  };
}
