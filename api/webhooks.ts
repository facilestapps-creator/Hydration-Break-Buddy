import router from "../artifacts/api-server/src/routes/webhooks";
import { createApiHandler } from "./_handler";

export default createApiHandler(router);
