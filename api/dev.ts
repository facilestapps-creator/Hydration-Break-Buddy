import router from "../artifacts/api-server/src/routes/dev";
import { createApiHandler } from "./_handler";

export default createApiHandler(router);
