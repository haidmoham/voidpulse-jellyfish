import * as THREE from 'three';

export class Cosmos {
  readonly group = new THREE.Group();
  private readonly material:THREE.ShaderMaterial;
  constructor(){
    let seed=937;
    const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
    const count=2400, positions=new Float32Array(count*3), sizes=new Float32Array(count), colors=new Float32Array(count*3);
    for(let i=0;i<count;i++){
      const a=random()*Math.PI*2, z=random()*2-1, radius=35+random()*35;
      positions.set([Math.sqrt(1-z*z)*Math.cos(a)*radius,z*radius,Math.sqrt(1-z*z)*Math.sin(a)*radius],i*3);
      sizes[i]=random()<.025?3.4: .6+random()*1.4;
      const cold=random()>.3;
      colors.set(cold?[.49+random()*.25,.62+random()*.25,1.]:[1.,.57+random()*.25,.38],i*3);
    }
    const geo=new THREE.BufferGeometry();
    geo.setAttribute('position',new THREE.BufferAttribute(positions,3));
    geo.setAttribute('size',new THREE.BufferAttribute(sizes,1));
    geo.setAttribute('color',new THREE.BufferAttribute(colors,3));
    this.material=new THREE.ShaderMaterial({
      transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
      uniforms:{time:{value:0},pixelRatio:{value:1}},
      vertexShader:`attribute float size; attribute vec3 color; varying vec3 vColor; uniform float time; uniform float pixelRatio;
      void main(){ vColor=color*(.35+.18*sin(time*.23+position.x)); vec4 mv=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*mv;gl_PointSize=size*pixelRatio;}`,
      fragmentShader:`varying vec3 vColor;void main(){float d=length(gl_PointCoord-.5)*2.; gl_FragColor=vec4(vColor,exp(-d*d*3.)*(1.-smoothstep(.3,1.,d)));}`,
    });
    this.group.add(new THREE.Points(geo,this.material));
  }
  update(time:number,pixelRatio:number):void {this.material.uniforms.time.value=time;this.material.uniforms.pixelRatio.value=pixelRatio;}
  dispose():void {this.group.traverse(o=>{if(o instanceof THREE.Points)o.geometry.dispose();});this.material.dispose();}
}
