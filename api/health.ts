import router from "../artifacts/api-server/src/routes/health";
import { createApiHandler } from "./_handler";

export default createApiHandler(router);
