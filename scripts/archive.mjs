import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {deflateRawSync} from 'node:zlib';
import {listFiles} from './files.mjs';

const table=Array.from({length:256},(_,value)=>{
 for(let bit=0;bit<8;bit++)value=value&1?0xedb88320^(value>>>1):value>>>1;
 return value>>>0;
});
export function crc32(bytes){
 let value=0xffffffff;for(const byte of bytes)value=table[(value^byte)&255]^(value>>>8);return (value^0xffffffff)>>>0;
}
export async function zipDirectory(directory,{prefix=''}={}){
 if(prefix&&(!/^[\w-]+$/.test(prefix)))throw new Error('Invalid ZIP folder prefix');
 const paths=await listFiles(directory);if(paths.length>65535)throw new Error('Too many files for this ZIP format');
 const local=[],central=[];let offset=0;
 for(const path of paths){
  const name=Buffer.from((prefix?prefix+'/':'')+path),bytes=await readFile(join(directory,path)),compressed=deflateRawSync(bytes),crc=crc32(bytes);
  if(name.length>65535||bytes.length>0xffffffff||offset+compressed.length+name.length+30>0xffffffff)throw new Error('Release exceeds this ZIP format');
  // Fixed 1980-01-01 timestamps make unchanged releases byte-for-byte reproducible.
  const header=Buffer.alloc(30);header.writeUInt32LE(0x04034b50);header.writeUInt16LE(20,4);header.writeUInt16LE(0x800,6);header.writeUInt16LE(8,8);header.writeUInt16LE(0x21,12);header.writeUInt32LE(crc,14);header.writeUInt32LE(compressed.length,18);header.writeUInt32LE(bytes.length,22);header.writeUInt16LE(name.length,26);
  local.push(header,name,compressed);
  const record=Buffer.alloc(46);record.writeUInt32LE(0x02014b50);record.writeUInt16LE(20,4);record.writeUInt16LE(20,6);record.writeUInt16LE(0x800,8);record.writeUInt16LE(8,10);record.writeUInt16LE(0x21,14);record.writeUInt32LE(crc,16);record.writeUInt32LE(compressed.length,20);record.writeUInt32LE(bytes.length,24);record.writeUInt16LE(name.length,28);record.writeUInt32LE(offset,42);central.push(record,name);
  offset+=header.length+name.length+compressed.length;
 }
 const index=Buffer.concat(central),end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50);end.writeUInt16LE(paths.length,8);end.writeUInt16LE(paths.length,10);end.writeUInt32LE(index.length,12);end.writeUInt32LE(offset,16);
 return Buffer.concat([...local,index,end]);
}
