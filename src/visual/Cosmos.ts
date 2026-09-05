import * as THREE from 'three';

/** The sky and motes share audio uniforms. Geometry stays on the GPU. */
export class Cosmos {
  readonly group = new THREE.Group();
  private readonly uniforms={time:{value:0},pixelRatio:{value:1},energy:{value:0},treble:{value:0},onset:{value:0},palette:{value:0},threat:{value:0}};
  private seed=937;

  constructor(){this.createStars();this.createNebula();this.createMotes();}

  private random():number {this.seed=(this.seed*1664525+1013904223)>>>0;return this.seed/4294967296;}

  private createStars():void {
    const count=3400, positions=new Float32Array(count*3), sizes=new Float32Array(count), colors=new Float32Array(count*3);
    for(let i=0;i<count;i++){
      const a=this.random()*Math.PI*2, z=this.random()*2-1, radius=35+this.random()*35;
      positions.set([Math.sqrt(1-z*z)*Math.cos(a)*radius,z*radius,Math.sqrt(1-z*z)*Math.sin(a)*radius],i*3);
      sizes[i]=this.random()<.022?3.2:.55+this.random()*1.25;
      colors.set(this.random()>.3?[.42,.75+this.random()*.15,.72]:[.9,.39,.30],i*3);
    }
    const geo=new THREE.BufferGeometry();
    geo.setAttribute('position',new THREE.BufferAttribute(positions,3));geo.setAttribute('size',new THREE.BufferAttribute(sizes,1));geo.setAttribute('color',new THREE.BufferAttribute(colors,3));
    this.group.add(new THREE.Points(geo,new THREE.ShaderMaterial({
      transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,uniforms:this.uniforms,
      vertexShader:`attribute float size;attribute vec3 color;varying vec3 vColor;uniform float time;uniform float pixelRatio;uniform float treble;
      void main(){vColor=color*.32;vec4 mv=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*mv;gl_PointSize=size*pixelRatio;}`,
      fragmentShader:`varying vec3 vColor;void main(){float d=length(gl_PointCoord-.5)*2.;gl_FragColor=vec4(vColor,exp(-d*d*3.)*(1.-smoothstep(.3,1.,d)));}`,
    })));
  }

  private createNebula():void {
    // A distant sphere keeps the cloud field continuous as the camera orbits.
    const material=new THREE.ShaderMaterial({uniforms:this.uniforms,side:THREE.BackSide,depthWrite:false,
      vertexShader:`varying vec3 vDirection;void main(){vDirection=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
      fragmentShader:`varying vec3 vDirection;uniform float palette;
      float hash(vec3 p){p=fract(p*.3183099+vec3(.1,.2,.3));p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
      float noise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
      return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
      mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
      float fbm(vec3 p){float f=noise(p)*.55;f+=noise(p*2.03+7.)*.27;f+=noise(p*4.11+13.)*.13;return f;}
      void main(){vec3 d=normalize(vDirection);vec3 p=d*3.1;
      float cloud=fbm(p+vec3(fbm(p*1.7),0.,fbm(p+12.)));
      float bandDistance=(d.y+.22*d.x+.06*sin(d.z*5.))/.43;
      float band=exp(-bandDistance*bandDistance);
      float density=pow(max(cloud-.31,0.)*2.25,2.)*band;
      float rift=pow(max(1.-abs(noise(p*5.+cloud*3.)*2.-1.),0.),3.);
      vec3 jade=vec3(.011,.049,.039),blood=vec3(.080,.009,.022);
      if(palette>.5){jade=palette<1.5?vec3(.12,.03,.01):vec3(.051,.09,.011);blood=palette<1.5?vec3(.075,.006,.013):vec3(.009,.048,.025);}
      vec3 color=mix(blood,jade,smoothstep(-.45,.65,d.x+sin(d.z*3.)*.3));
      float tendrils=pow(smoothstep(.38,.72,fbm(p*2.+vec3(cloud*3.,0.,0.))),2.);
      color*=density*(.66+rift*.75)*(1.-tendrils*.8);color+=vec3(.0006,.0012,.0020);
      gl_FragColor=vec4(color,1.);}`,
    });
    const sky=new THREE.Mesh(new THREE.SphereGeometry(85,32,20),material);sky.renderOrder=-10;this.group.add(sky);
  }

  private createMotes():void {
    const count=850,positions=new Float32Array(count*3),seeds=new Float32Array(count);
    for(let i=0;i<count;i++){
      const a=this.random()*Math.PI*2,r=3.8+this.random()*13;
      positions.set([Math.cos(a)*r,(this.random()-.5)*17,Math.sin(a)*r],i*3);seeds[i]=this.random();
    }
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(positions,3));geo.setAttribute('seed',new THREE.BufferAttribute(seeds,1));
    this.group.add(new THREE.Points(geo,new THREE.ShaderMaterial({uniforms:this.uniforms,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
      vertexShader:`attribute float seed;varying float vSeed;varying float vFade;uniform float time;uniform float energy;uniform float pixelRatio;uniform float onset;uniform float threat;
      void main(){vSeed=seed;vec3 p=position;float a=time*.008*(.3+seed);p.xz=mat2(cos(a),-sin(a),sin(a),cos(a))*p.xz;
      p.y+=sin(time*.04+seed*30.)*.18;p*=1.-threat*.085;vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;
      gl_PointSize=clamp((seed>.94?38.:10.)*pixelRatio/length(mv.xyz),1.,5.);vFade=smoothstep(2.,6.,length(mv.xyz))*.45;}`,
      fragmentShader:`varying float vSeed;varying float vFade;uniform float time;uniform float treble;uniform float palette;
      void main(){float d=length(gl_PointCoord-.5)*2.;if(d>1.)discard;vec3 c=mix(vec3(.13,.75,.55),vec3(.9,.12,.14),step(.78,vSeed));
      if(palette>.5)c=palette<1.5?vec3(.95,.25,.09):vec3(.52,.86,.16);float glow=.3+.25*vSeed;
      gl_FragColor=vec4(c*.55,pow(1.-d,2.)*glow*vFade);}`,
    })));
  }

  setPalette(preset:'abyss'|'ritual'|'venom'):void {this.uniforms.palette.value=preset==='ritual'?1:preset==='venom'?2:0;}

  update(time:number,pixelRatio:number,energy=0,treble=0,onset=0,threat=0):void {
    this.uniforms.time.value=time;this.uniforms.pixelRatio.value=pixelRatio;this.uniforms.energy.value=energy;this.uniforms.treble.value=treble;this.uniforms.onset.value=onset;
    this.uniforms.threat.value=threat;
  }

  dispose():void {
    this.group.traverse(o=>{if(o instanceof THREE.Points||o instanceof THREE.Mesh){o.geometry.dispose();(o.material as THREE.Material).dispose();}});this.group.clear();
  }
}
