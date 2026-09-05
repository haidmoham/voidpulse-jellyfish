import * as THREE from 'three';

const vertex = `
varying vec2 vUv;
void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }
`;

// GLSL pow has an undefined result for negative bases, even with exponent 2.
const square = 'float square(float x){return x*x;}';

export class Singularity {
  readonly group = new THREE.Group();
  private readonly disk: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  private readonly corona: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  private readonly arcs: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  private readonly sigils = new THREE.Group();
  private readonly orbitUniforms={time:{value:0},energy:{value:0},treble:{value:0},onset:{value:0},mid:{value:0},palette:{value:0},threat:{value:0}};

  constructor() {
    this.group.position.y = 0.65;
    // Interior vertices let the shader bend the disk between its edges.
    this.disk = new THREE.Mesh(new THREE.PlaneGeometry(9,9,64,64),new THREE.ShaderMaterial({
      vertexShader: `varying vec2 vUv;uniform float force;uniform float time;uniform float threat;
      void main(){vUv=uv;vec3 p=position;float radial=length(p.xy);float outer=smoothstep(.8,3.8,radial);
      float a=atan(p.y,p.x);
      p.xy*=1.-threat*.16*outer;
      p.z+=sin(a*3.+radial*2.5)*threat*.55*outer;
      p.z+=sin(radial*4.-time*.5)*force*.025*outer;
      gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`, transparent:true, depthWrite:false, side:THREE.DoubleSide,
      blending:THREE.AdditiveBlending,
      uniforms:{time:{value:0},energy:{value:0},force:{value:0}},
      fragmentShader:`
      varying vec2 vUv;
      float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
      float noise(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y); }
      void main(){
        vec2 p=(vUv-.5)*9.; float r=length(p); float a=atan(p.y,p.x);
        float inner=smoothstep(.87,1.14,r); float outer=exp(-max(r-1.15,0.)*1.32);
        float orbit=a;
        float n=noise(vec2(r*19.+cos(orbit*9.)*1.5,sin(orbit*9.)*2.));
        float phase=r*68.+n*2.+sin(orbit*7.)*.8;
        float threads=mix(pow(.5+.5*sin(phase),3.),.3125,smoothstep(.5,2.5,fwidth(phase)));
        float cloud=noise(vec2(r*7.+cos(orbit*4.)*2.,sin(orbit*4.)*3.));
        float spiral=pow(.5+.5*sin(r*24.-orbit*7.+n*2.),5.);
        float doppler=.42+1.05*pow(.5+.5*cos(a-.6),2.);
        float density=inner*outer*(.10+threads*.50+cloud*.27+spiral*.3)*doppler;
        vec3 col=mix(vec3(.85,.025,.08),vec3(1.7,.31,.12),exp(-max(r-1.,0.)*.95));
        col=mix(col,vec3(1.,.91,.72),threads*.2);
        float blueShift=pow(.5+.5*cos(a-.6),12.)*exp(-max(r-1.,0.)*1.8);
        col=mix(col,vec3(.10,1.4,.95),blueShift*.85);
        float edge=1.-smoothstep(3.5,4.4,r);
        // Shading stays fixed to the disk. Only its geometry moves.
        float eclipse=1.-.62*pow(.5+.5*sin(orbit*5.+r*1.7),4.);
        gl_FragColor=vec4(col*density*1.9*eclipse,edge);
      }`,
    }));
    this.disk.rotation.x=-Math.PI/2+.12;
    this.disk.rotation.z=.08;
    this.group.add(this.disk);
    const core=new THREE.Mesh(new THREE.SphereGeometry(.86,64,48),new THREE.MeshBasicMaterial({color:0x000000}));
    this.group.add(core);

    this.corona = new THREE.Mesh(new THREE.PlaneGeometry(4.7,4.7),new THREE.ShaderMaterial({
      vertexShader:vertex, transparent:true, depthWrite:false, blending:THREE.AdditiveBlending,
      uniforms:{time:{value:0},energy:{value:0},treble:{value:0}},
      fragmentShader:`${square} varying vec2 vUv; uniform float time; uniform float energy; uniform float treble;
      void main(){vec2 p=(vUv-.5)*4.7;float r=length(p),a=atan(p.y,p.x);
      float aa=max(fwidth(r),.003);
      float rim=exp(-square((r-.88)/max(.012,aa))); float glow=exp(-abs(r-.9)*14.)*.35;
      float fine=exp(-square((r-.946)/max(.009,aa)))*.20;
      float d=.42+.58*pow(.5+.5*cos(a+.3),2.);
      vec3 c=mix(vec3(2.1,.04,.13),vec3(1.6,.47,.18),d);
      c=mix(c,vec3(.12,1.8,1.2),pow(.5+.5*cos(a-2.4),14.)*.9);
      float mask=smoothstep(.86,.88,r);
      float outer=exp(-abs(r-1.02)*60.);
      float iris=pow(max(.5+.5*cos(a*11.+r*8.),0.),3.)*exp(-square((r-1.09)/.15));
      gl_FragColor=vec4((c*(rim*2.1+glow+fine)*d+vec3(.2,.9,.62)*outer*.40+vec3(.26,.045,.055)*iris*.35)*mask,1.);}`,
    }));
    this.group.add(this.corona);
    // A stylized secondary image of the disk wraps over the shadow.
    this.arcs = new THREE.Mesh(new THREE.PlaneGeometry(5.8,5.8),new THREE.ShaderMaterial({
      vertexShader:vertex, transparent:true, depthWrite:false, blending:THREE.AdditiveBlending,
      uniforms:{time:{value:0}},
      fragmentShader:`${square} varying vec2 vUv; uniform float time;
      void main(){vec2 p=(vUv-.5)*5.8; float r=length(vec2(p.x,p.y*.87));float a=atan(p.y,p.x);
      float band=exp(-square((r-1.04)/.16));
      float phase=r*95.+sin(a*12.)*.8;
      float fibers=mix(pow(.5+.5*sin(phase),3.),.3125,smoothstep(.5,2.5,fwidth(phase)));
      float top=smoothstep(-.2,.55,p.y); float bot=(1.-smoothstep(-.9,.1,p.y))*.22;
      vec3 c=mix(vec3(1.5,.12,.035),vec3(1.4,.62,.19),fibers);
      float flank=.5+.5*cos(a-2.6);
      c=mix(c,vec3(.08,1.45,.9),pow(flank,7.)*.8);
      float outer=exp(-square((r-1.22)/.14));
      float stream=.75+.25*sin(a*7.+r*32.);
      vec3 violet=mix(vec3(1.1,.035,.12),vec3(.04,.8,.54),flank);
      gl_FragColor=vec4(c*band*(.15+fibers*.65)*(top+bot)*1.8+violet*outer*stream*(top+bot)*.42,1.);}`,
    }));
    this.group.add(this.arcs);
    this.createSigils();
    for(const mesh of [this.disk,this.corona,this.arcs]){
      mesh.material.uniforms.palette=this.orbitUniforms.palette;
      mesh.material.uniforms.threat=this.orbitUniforms.threat;
      mesh.material.fragmentShader='uniform float palette;\n'+mesh.material.fragmentShader.replace(/}\s*$/,`
        vec3 paletteColor=gl_FragColor.rgb;
        vec3 ritual=vec3(paletteColor.r*1.1+paletteColor.g*.4,paletteColor.r*.13+paletteColor.g*.18,paletteColor.b*.25);
        vec3 venom=vec3(paletteColor.r*.48+paletteColor.g*.35,paletteColor.r*.7+paletteColor.g,paletteColor.b*.25);
        gl_FragColor.rgb=mix(paletteColor,mix(ritual,venom,step(1.5,palette)),step(.5,palette));
      }`);
    }
  }

  private createSigils():void {
    const positions:number[]=[], phases:number[]=[];
    const segment=(a:number,r:number,b:number,s:number,phase:number)=>{
      positions.push(Math.cos(a)*r,Math.sin(a)*r,0,Math.cos(b)*s,Math.sin(b)*s,0);
      phases.push(phase,phase);
    };
    for(let i=0;i<192;i++){
      const a=i/192*Math.PI*2, b=(i+1)/192*Math.PI*2;
      if(i%16<12)segment(a,2.65,b,2.65,a);
      if(i%4===0)segment(a,2.72,a,2.76+(i%16===0?.14:0),a);
      if(i%8===0){
        const d=.026;
        segment(a-d,2.87,a+d,2.98,a);segment(a+d,2.98,a+d,2.84,a);
        segment(a-d,2.94,a+d,2.88,a);
      }
    }
    const geo=new THREE.BufferGeometry();
    geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
    geo.setAttribute('phase',new THREE.Float32BufferAttribute(phases,1));
    const material=new THREE.ShaderMaterial({uniforms:this.orbitUniforms,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
      vertexShader:`attribute float phase;varying float vPhase;uniform float energy;uniform float threat;
      void main(){vPhase=phase;vec3 p=position;p.xy*=1.-threat*.07*(.5+.5*sin(phase*3.));gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,
      fragmentShader:`varying float vPhase;uniform float time;uniform float energy;uniform float mid;uniform float palette;
      void main(){float current=pow(.5+.5*sin(vPhase*3.),5.);
      vec3 c=mix(vec3(.23,.56,.44),vec3(1.4,.12,.13),current);
      if(palette>.5)c=palette<1.5?vec3(1.2,.23,.08):vec3(.65,1.,.1);
      gl_FragColor=vec4(c*(.38+current*.35),.40);}`});
    const ring=new THREE.LineSegments(geo,material);
    ring.rotation.x=.23;ring.position.z=-.65;
    this.sigils.add(ring);this.group.add(this.sigils);

    const count=1100, points=new Float32Array(count*3), seeds=new Float32Array(count);
    let seed=923;
    const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
    for(let i=0;i<count;i++){
      const a=random()*Math.PI*2,r=1.12+Math.pow(random(),1.8)*3.5;
      points.set([Math.cos(a)*r,(random()-.5)*.18,Math.sin(a)*r],i*3);seeds[i]=random();
    }
    const particleGeo=new THREE.BufferGeometry();
    particleGeo.setAttribute('position',new THREE.BufferAttribute(points,3));particleGeo.setAttribute('seed',new THREE.BufferAttribute(seeds,1));
    this.group.add(new THREE.Points(particleGeo,new THREE.ShaderMaterial({uniforms:this.orbitUniforms,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
      vertexShader:`attribute float seed;varying float vSeed;uniform float time;uniform float energy;uniform float onset;uniform float treble;uniform float threat;
      void main(){vSeed=seed;vec3 p=position;float r=length(p.xz);float a=time*.035/max(r,.5)+threat*.45*(seed>.5?1.:-1.);
      p.xz=mat2(cos(a),-sin(a),sin(a),cos(a))*p.xz;p.y+=sin(time*.4+seed*50.)*.04;
      p.xz*=1.-threat*.19;vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;gl_PointSize=clamp(12.*(.3+seed)/-mv.z,1.,3.);}`,
      fragmentShader:`varying float vSeed;uniform float time;uniform float treble;uniform float palette;
      void main(){float d=length(gl_PointCoord-.5)*2.;if(d>1.)discard;
      vec3 c=mix(vec3(1.6,.17,.075),vec3(.12,1.25,.75),step(.85,vSeed));
      if(palette>.5)c=palette<1.5?vec3(1.8,.24,.08):vec3(.72,1.6,.11);
      float signal=.45+.3*vSeed;
      gl_FragColor=vec4(c*.75,pow(1.-d,2.)*signal*.65);}`
    })));
  }

  setPalette(preset:'abyss'|'ritual'|'venom'):void {
    this.orbitUniforms.palette.value=preset==='ritual'?1:preset==='venom'?2:0;
  }

  update(time:number, energy:number, camera:THREE.Camera,treble=0,force=0,mid=0,onset=0,threat=0):void {
    this.orbitUniforms.time.value=time;this.orbitUniforms.energy.value=energy;
    this.orbitUniforms.treble.value=treble;this.orbitUniforms.mid.value=mid;this.orbitUniforms.onset.value=onset;
    this.orbitUniforms.threat.value=threat;
    this.sigils.rotation.z=time*.008+threat*.12;
    this.disk.material.uniforms.time.value=time;
    this.disk.material.uniforms.energy.value=energy;
    this.disk.material.uniforms.force.value=force;
    this.corona.material.uniforms.time.value=time;
    this.corona.material.uniforms.energy.value=energy;
    this.corona.material.uniforms.treble.value=treble;
    this.arcs.material.uniforms.time.value=time;
    this.corona.quaternion.copy(camera.quaternion);
    this.arcs.quaternion.copy(camera.quaternion);
  }

  dispose():void {
    this.group.traverse(o=>{ if(o instanceof THREE.Mesh||o instanceof THREE.LineSegments||o instanceof THREE.Points){o.geometry.dispose(); (o.material as THREE.Material).dispose();} });
    this.group.clear();
  }
}
