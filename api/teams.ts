import router from "../artifacts/api-server/src/routes/teams";
import { createApiHandler } from "./_handler";

export default createApiHandler(router);
