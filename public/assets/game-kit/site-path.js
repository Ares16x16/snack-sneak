// Resolve from this module so nested pages and custom domains share one mount.
export function localPath(path,moduleURL=import.meta.url){
 if(typeof path!=='string'||!/^\/(?!\/)/.test(path))return path;
 const module=new URL(moduleURL);
 const base=module.protocol==='http:'||module.protocol==='https:'?new URL('../../',module).pathname:'/';
 return base+path.slice(1);
}
