import {createVpgHandler} from "./vpg.js";
import {getVpgCup} from "../server/vpg/cupService.js";
export default createVpgHandler(getVpgCup);
