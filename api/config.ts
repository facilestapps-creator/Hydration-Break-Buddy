import router from "../artifacts/api-server/src/routes/config";
import { createApiHandler } from "./_handler";

export default createApiHandler(router);
