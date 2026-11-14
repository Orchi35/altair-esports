import {normalizeBuild} from './engine.js';

export const validShareId=id=>typeof id==='string'&&/^[A-Za-z0-9_-]{12}$/.test(id);
export function shortBuildUrl(id,origin=window.location.origin){
 if(!validShareId(id))throw new Error('INVALID_SHARE_ID');
 return `${origin}/b/${id}`;
}
export async function saveSharedBuild(build){
 const response=await fetch('/api/builds',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({build:normalizeBuild(build)}),signal:AbortSignal.timeout(12000)});
 const data=await response.json();
 if(!response.ok||!validShareId(data.id))throw new Error(data.error||'SHARE_UNAVAILABLE');
 return data.id;
}
export async function loadSharedBuild(id,signal){
 if(!validShareId(id))throw new Error('INVALID_SHARE_ID');
 const response=await fetch(`/api/builds?id=${id}`,{signal});
 const data=await response.json();
 if(!response.ok)throw new Error(response.status===404?'BUILD_NOT_FOUND':'SHARE_UNAVAILABLE');
 return normalizeBuild(data.build);
}
