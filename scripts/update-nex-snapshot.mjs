import {writeFile} from "node:fs/promises";
import {createNexService} from "../server/nex/service.js";
import {createNexRosterService} from "../server/nex/playerService.js";

const [data,roster]=await Promise.all([createNexService()(),createNexRosterService()()]);
if(data.status!=="fresh" || roster.status!=="fresh") throw new Error("Nex source could not be verified; the existing snapshots were not changed.");
await writeFile(new URL("../public/data/nex-super-lig.json",import.meta.url),`${JSON.stringify(data,null,2)}\n`);
await writeFile(new URL("../public/data/nex-roster.json",import.meta.url),`${JSON.stringify(roster,null,2)}\n`);
console.log(`Nex snapshot updated: ${data.standings.length} teams, ${data.fixtures.length} fixtures, ${data.results.length} results.`);
