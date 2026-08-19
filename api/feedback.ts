import router from "../artifacts/api-server/src/routes/feedback";
import { createApiHandler } from "./_handler";

export default createApiHandler(router);
