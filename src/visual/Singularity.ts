import * as THREE from 'three';

const vertex = `
varying vec2 vUv;
void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }
`;

export class Singularity {
  readonly group = new THREE.Group();
  private readonly disk: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  private readonly corona: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  private readonly arcs: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;

  constructor() {
    this.group.position.y = 0.65;
    this.disk = new THREE.Mesh(new THREE.PlaneGeometry(9,9),new THREE.ShaderMaterial({
      vertexShader: vertex, transparent:true, depthWrite:false, side:THREE.DoubleSide,
      blending:THREE.AdditiveBlending,
      uniforms:{time:{value:0},energy:{value:0}},
      fragmentShader:`
      varying vec2 vUv; uniform float time; uniform float energy;
      float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
      float noise(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y); }
      void main(){
        vec2 p=(vUv-.5)*9.; float r=length(p); float a=atan(p.y,p.x);
        float inner=smoothstep(.87,1.14,r); float outer=exp(-max(r-1.15,0.)*1.32);
        float orbit=a-time*.13/max(r*.3,.3);
        float n=noise(vec2(r*19.+cos(orbit*9.)*1.5,sin(orbit*9.)*2.));
        float threads=pow(.5+.5*sin(r*139.+n*4.+sin(orbit*13.)*1.4),4.);
        float cloud=noise(vec2(r*7.+cos(orbit*4.)*2.,sin(orbit*4.)*3.));
        float spiral=pow(.5+.5*sin(r*24.-orbit*7.+n*2.),5.);
        float doppler=.42+1.05*pow(.5+.5*cos(a-.6),2.);
        float density=inner*outer*(.15+threads*.55+cloud*.36+spiral*.3)*doppler*(1.+energy*.15);
        vec3 col=mix(vec3(1.,.20,.045),vec3(1.,.69,.31),exp(-max(r-1.,0.)*.95));
        col=mix(col,vec3(1.,.91,.72),threads*.2);
        float blueShift=pow(.5+.5*cos(a-.6),12.)*exp(-max(r-1.,0.)*1.8);
        col=mix(col,vec3(.17,.65,1.5),blueShift*.85);
        float edge=1.-smoothstep(3.5,4.4,r);
        gl_FragColor=vec4(col*density*3.8,edge);
      }`,
    }));
    this.disk.rotation.x=-Math.PI/2+.12;
    this.disk.rotation.z=.08;
    this.group.add(this.disk);
    const core=new THREE.Mesh(new THREE.SphereGeometry(.86,64,48),new THREE.MeshBasicMaterial({color:0x000000}));
    this.group.add(core);

    this.corona = new THREE.Mesh(new THREE.PlaneGeometry(4.7,4.7),new THREE.ShaderMaterial({
      vertexShader:vertex, transparent:true, depthWrite:false, blending:THREE.AdditiveBlending,
      uniforms:{time:{value:0}},
      fragmentShader:`varying vec2 vUv; uniform float time;
      void main(){vec2 p=(vUv-.5)*4.7;float r=length(p),a=atan(p.y,p.x);
      float rim=exp(-abs(r-.88)*100.); float glow=exp(-abs(r-.9)*14.)*.35;
      float fine=exp(-abs(r-.936)*170.)*.25;
      float d=.42+.58*pow(.5+.5*cos(a+.3),2.);
      vec3 c=mix(vec3(1.5,.09,.18),vec3(1.5,.67,.14),d);
      c=mix(c,vec3(.18,.8,2.),pow(.5+.5*cos(a-2.4),14.)*.9);
      float mask=smoothstep(.86,.88,r);
      float outer=exp(-abs(r-1.02)*60.);
      gl_FragColor=vec4((c*(rim*2.4+glow+fine)*d+vec3(.35,.06,.8)*outer*.3)*mask,1.);}`,
    }));
    this.group.add(this.corona);
    // A stylized secondary image of the disk wraps over the shadow.
    this.arcs = new THREE.Mesh(new THREE.PlaneGeometry(5.8,5.8),new THREE.ShaderMaterial({
      vertexShader:vertex, transparent:true, depthWrite:false, blending:THREE.AdditiveBlending,
      uniforms:{time:{value:0}},
      fragmentShader:`varying vec2 vUv; uniform float time;
      void main(){vec2 p=(vUv-.5)*5.8; float r=length(vec2(p.x,p.y*.87));float a=atan(p.y,p.x);
      float band=exp(-pow((r-1.04)/.16,2.));
      float fibers=pow(.5+.5*sin(r*210.+sin(a*18.-time*.5)*1.2),5.);
      float top=smoothstep(-.2,.55,p.y); float bot=(1.-smoothstep(-.9,.1,p.y))*.22;
      vec3 c=mix(vec3(1.5,.12,.035),vec3(1.4,.62,.19),fibers);
      float flank=.5+.5*cos(a-2.6);
      c=mix(c,vec3(.08,.75,2.1),pow(flank,7.)*.8);
      float outer=exp(-pow((r-1.22)/.14,2.));
      float stream=.65+.35*sin(a*9.-time*.22+r*70.);
      vec3 violet=mix(vec3(.65,.035,1.2),vec3(.04,.55,1.3),flank);
      gl_FragColor=vec4(c*band*(.15+fibers*.65)*(top+bot)*1.8+violet*outer*stream*(top+bot)*.42,1.);}`,
    }));
    this.group.add(this.arcs);
  }

  update(time:number, energy:number, camera:THREE.Camera):void {
    this.disk.material.uniforms.time.value=time;
    this.disk.material.uniforms.energy.value=energy;
    this.corona.material.uniforms.time.value=time;
    this.arcs.material.uniforms.time.value=time;
    this.corona.quaternion.copy(camera.quaternion);
    this.arcs.quaternion.copy(camera.quaternion);
  }

  dispose():void {
    this.group.traverse(o=>{ if(o instanceof THREE.Mesh){o.geometry.dispose(); (o.material as THREE.Material).dispose();} });
  }
}
