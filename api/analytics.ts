import router from "../artifacts/api-server/src/routes/analytics";
import { createApiHandler } from "./_handler";

export default createApiHandler(router);
