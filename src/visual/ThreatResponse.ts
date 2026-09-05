/** Measured attacks steer a damped response. Position and velocity stay continuous. */
export class ThreatResponse {
  private previousOnset=0;
  private previousBass=0;
  private previousImpulse=0;
  private age=10;
  private strength=0;
  private level=0;
  private velocity=0;
  private trailing=0;

  get reach():number {
    const separation=Math.max(0,Math.min(1,(this.trailing-this.level*.55)*2));
    return separation*separation*(3-2*separation);
  }

  update(dt:number,onset:number,bass:number,impulse:number,enabled:boolean):number {
    if(!enabled){
      this.previousOnset=onset;this.previousBass=bass;this.previousImpulse=impulse;
      this.age=10;this.strength=0;this.level=0;this.velocity=0;this.trailing=0;return 0;
    }
    const step=Math.max(0,Math.min(.05,dt));
    this.age+=step;
    const onsetRise=onset-this.previousOnset,bassRise=bass-this.previousBass;
    const manual=impulse-this.previousImpulse>.1;
    if(manual||(this.age>.23&&((onset>.07&&onsetRise>.018)||bassRise>.065))){
      this.age=0;
      this.strength=Math.min(1,Math.max(manual?1:0,onset*5,bassRise*5));
    }
    if(this.age<.075)this.strength=Math.min(1,Math.max(this.strength,onset*5));
    this.previousOnset=onset;this.previousBass=bass;this.previousImpulse=impulse;
    const target=this.strength*Math.exp(-Math.max(0,this.age-.18)*3.6);
    // Exact critically damped spring step. A new beat preserves the current velocity.
    const frequency=14,offset=this.level-target,combined=this.velocity+frequency*offset;
    const decay=Math.exp(-frequency*step);
    this.level=target+(offset+combined*step)*decay;
    this.velocity=(this.velocity-frequency*combined*step)*decay;
    this.trailing+=(this.level-this.trailing)*(1-Math.exp(-step*3.8));
    return this.level;
  }
}
