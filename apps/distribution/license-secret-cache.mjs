export async function createLicenseSecretCache(redisUrl) {
  if (!redisUrl) return { enabled:false,put:async()=>{},get:async()=>null,remove:async()=>{},close:async()=>{} };
  try {
    const {createClient}=await import('redis');const redis=createClient({url:redisUrl});redis.on('error',()=>{});await redis.connect();
    const key=(id)=>`lightbi:license:delivery:${id}`;
    return {enabled:true,put:(id,value)=>redis.set(key(id),value,{EX:86400}),get:(id)=>redis.get(key(id)),remove:(id)=>redis.del(key(id)),close:async()=>{if(redis.isReady)await redis.quit();}};
  } catch { return { enabled:false,put:async()=>{},get:async()=>null,remove:async()=>{},close:async()=>{} }; }
}
