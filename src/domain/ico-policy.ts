import sharp from 'sharp';

// Inspect the container and decode embedded PNGs without rewriting the original.
export async function validateIco(bytes:Uint8Array) {
  const data=Buffer.from(bytes);
  if(data.length<22||data.readUInt16LE(0)!==0||data.readUInt16LE(2)!==1)throw new Error('invalid_asset');
  const count=data.readUInt16LE(4),directoryEnd=6+count*16;
  if(count<1||count>64||directoryEnd>data.length)throw new Error('invalid_asset');
  const ranges:{start:number;end:number}[]=[];let largestWidth=0,largestHeight=0,totalPixels=0;
  for(let index=0;index<count;index++){
    const entry=6+index*16,width=data[entry]||256,height=data[entry+1]||256;
    const size=data.readUInt32LE(entry+8),offset=data.readUInt32LE(entry+12);
    if(data[entry+3]!==0||size<8||offset<directoryEnd||offset+size>data.length)throw new Error('invalid_asset');
    ranges.push({start:offset,end:offset+size});
    const frame=data.subarray(offset,offset+size);
    if(frame.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))){
      const image=sharp(frame,{limitInputPixels:16000000,failOn:'warning',animated:true});const metadata=await image.metadata();
      if(metadata.format!=='png'||!metadata.width||!metadata.height||metadata.width>8192||metadata.height>8192||
        (data[entry]!==0?metadata.width!==width:metadata.width<256)||
        (data[entry+1]!==0?metadata.height!==height:metadata.height<256)||(metadata.pages??1)!==1)throw new Error('invalid_asset');
      totalPixels+=metadata.width*metadata.height;if(totalPixels>16000000)throw new Error('invalid_asset');
      if(metadata.width*metadata.height>largestWidth*largestHeight){largestWidth=metadata.width;largestHeight=metadata.height;}
      await image.raw().toBuffer();
    }else{
      totalPixels+=width*height;if(totalPixels>16000000)throw new Error('invalid_asset');
      if(frame.length<40||frame.readUInt32LE(0)!==40||frame.readInt32LE(4)!==width||
        frame.readInt32LE(8)!==height*2||frame.readUInt16LE(12)!==1||frame.readUInt32LE(16)!==0)throw new Error('invalid_asset');
      const depth=frame.readUInt16LE(14);
      if(![1,4,8,16,24,32].includes(depth))throw new Error('invalid_asset');
      const declaredColors=frame.readUInt32LE(32),colors=depth<=8?(declaredColors||2**depth):0;
      if((depth<=8&&colors>2**depth)||(depth>8&&declaredColors!==0))throw new Error('invalid_asset');
      const pixelStart=40+colors*4,rowBytes=Math.ceil(width*depth/32)*4,maskBytes=Math.ceil(width/32)*4;
      if(pixelStart+height*(rowBytes+maskBytes)!==frame.length)throw new Error('invalid_asset');
      if(depth<=8)for(let y=0;y<height;y++)for(let x=0;x<width;x++){
        const raw=frame[pixelStart+y*rowBytes+Math.floor(x*depth/8)]!;
        const color=depth===8?raw:depth===4?(raw>>(x%2===0?4:0))&15:(raw>>(7-x%8))&1;
        if(color>=colors)throw new Error('invalid_asset');
      }
      if(width*height>largestWidth*largestHeight){largestWidth=width;largestHeight=height;}
    }
  }
  ranges.sort((a,b)=>a.start-b.start);
  for(let index=1;index<ranges.length;index++)if(ranges[index]!.start<ranges[index-1]!.end)throw new Error('invalid_asset');
  return {width:largestWidth,height:largestHeight,frame_count:count,mime_type:'image/vnd.microsoft.icon',byte_size:bytes.byteLength};
}
