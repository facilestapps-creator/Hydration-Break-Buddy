import router from "../artifacts/api-server/src/routes/users";
import { createApiHandler } from "./_handler";

export default createApiHandler(router);
