import router from "../artifacts/api-server/src/routes/payments";
import { createApiHandler } from "./_handler";

export default createApiHandler(router);
