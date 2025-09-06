@component
export class VehicleAnimationController extends BaseScriptComponent {
  @input hoverAnimation: AnimationAsset;

  // Simplified hover animation parameters
  @ui.group_start("Hover Animation")
  @input
  @widget(new SpinBoxWidget(0, undefined, 0.1))
  @hint("Start time for hover animation in seconds")
  hoverStartTime: number = 0.0;

  @input
  @widget(new SpinBoxWidget(0, undefined, 0.1))
  @hint("End time for hover animation in seconds")
  hoverEndTime: number = 5.0;

  @ui.group_end

  private animationPlayer: AnimationPlayer;

  private hoverClip: AnimationClip = null;
  private idleClip: AnimationClip = null;

  private clips: AnimationClip[] = [];
  private currClip: AnimationClip = null;

  onAwake() {
    this.createEvent("OnStartEvent").bind(this.onStart.bind(this));
  }

  private onStart() {
    this.createEvent("UpdateEvent").bind(this.onUpdate.bind(this));
    this.animationPlayer = this.getSceneObject().createComponent("AnimationPlayer");
    
    // Log the timing parameters being used
    print(`[VehicleAnimationController] Using hover timing: ${this.hoverStartTime}s-${this.hoverEndTime}s`);
    
    this.createAllAnimationClips();
    // Set hover as the default animation for continuous movement
    this.currClip = this.hoverClip;
    if (this.hoverClip) {
      this.playHoverAnimation();
    }
    print("[VehicleAnimationController] Animation system initialized with hover animation");
  }

  playHoverAnimation() {
    this.playLoopedAnimation(this.hoverClip);
  }

  playIdleAnimation() {
    this.playLoopedAnimation(this.idleClip);
  }

  private playSingleAnimation(clip: AnimationClip) {
    if (this.animationPlayer != null && clip != null) {
      print(`[VehicleAnimationController] Playing single: ${clip.name} (${clip.begin}s -> ${clip.end}s)`);
      
      // Stop all other clips first
      this.stopAllClips();
      
      // Set up and play the new clip
      this.setNewClip(clip);
      clip.weight = 1.0;
      this.animationPlayer.playClip(clip.name);
    }
  }

  private playLoopedAnimation(clip: AnimationClip) {
    if (this.animationPlayer != null && clip != null) {
      print(`[VehicleAnimationController] Playing looped: ${clip.name} (${clip.begin}s -> ${clip.end}s)`);
      
      // Stop all other clips first
      this.stopAllClips();
      
      // Set up and play the new clip
      this.setNewClip(clip);
      clip.weight = 1.0;
      this.animationPlayer.playClip(clip.name);
    }
  }

  private stopAllClips() {
    // Set all clips weight to 0 and stop them
    this.clips.forEach(clip => {
      if (clip) {
        clip.weight = 0;
        this.animationPlayer.stopClip(clip.name);
      }
    });
  }

  private createAllAnimationClips() {
    if (!this.hoverAnimation) {
      print("[VehicleAnimationController] Warning: No hover animation asset assigned!");
      return;
    }

    // Create hover animation clip (looped)
    this.hoverClip = this.createLoopedClip("VehicleHover", this.hoverAnimation, this.hoverStartTime, this.hoverEndTime);
    
    // Idle: No animation (weight 0)
    this.idleClip = this.createIdleClip("VehicleHover_Idle");

    print(`[VehicleAnimationController] Created ${this.clips.length} animation clips`);
    print(`[VehicleAnimationController] Hover: ${this.hoverStartTime}s -> ${this.hoverEndTime}s (looped)`);
  }

  private createLoopedClip(
    name: string,
    animAsset: AnimationAsset,
    beginTime: number,
    endTime: number
  ): AnimationClip {
    const clip = AnimationClip.createFromAnimation(name, animAsset);
    clip.begin = beginTime;
    clip.end = endTime;
    clip.playbackMode = PlaybackMode.Loop;
    clip.weight = 0;
    clip.playbackSpeed = 1.0;
    this.animationPlayer.addClip(clip);
    this.clips.push(clip);
    print(`[VehicleAnimationController] Created looped clip: ${name} (${beginTime}s -> ${endTime}s)`);
    return clip;
  }

  private createSingleClip(
    name: string,
    animAsset: AnimationAsset,
    beginTime: number,
    endTime: number
  ): AnimationClip {
    const clip = AnimationClip.createFromAnimation(name, animAsset);
    clip.begin = beginTime;
    clip.end = endTime;
    clip.playbackMode = PlaybackMode.Single;
    clip.weight = 0;
    clip.playbackSpeed = 1.0;
    this.animationPlayer.addClip(clip);
    this.clips.push(clip);
    print(`[VehicleAnimationController] Created single clip: ${name} (${beginTime}s -> ${endTime}s)`);
    return clip;
  }

  private createIdleClip(name: string): AnimationClip {
    // Create a static clip for idle state (first frame only)
    const clip = AnimationClip.createFromAnimation(name, this.hoverAnimation);
    clip.begin = 0.0;
    clip.end = 0.1; // Very short duration for static pose
    clip.weight = 0;
    clip.playbackMode = PlaybackMode.Single;
    clip.playbackSpeed = 0.0; // Static - no movement
    this.animationPlayer.addClip(clip);
    this.clips.push(clip);
    print(`[VehicleAnimationController] Created idle clip: ${name} (static at 0.0s)`);
    return clip;
  }

  private setNewClip(clip: AnimationClip) {
    this.currClip = clip;
  }

  private blendClips() {
    if (!this.currClip) return;
    
    for (const clip of this.clips) {
      if (clip) {
        const targetWeight = clip.name === this.currClip.name ? 1.0 : 0.0;
        const blendSpeed = 5.0; // Smooth transition speed
        clip.weight = MathUtils.lerp(clip.weight, targetWeight, getDeltaTime() * blendSpeed);
        
        // Debug weight changes
        if (Math.abs(clip.weight - targetWeight) > 0.01) {
          // print(`[VehicleAnimationController] Blending ${clip.name}: ${clip.weight.toFixed(3)} -> ${targetWeight}`);
        }
      }
    }
  }

  private isClipAlmostDone(clip: AnimationClip): boolean {
    if (!clip || !this.animationPlayer) return false;
    return (
      this.animationPlayer.getClipCurrentTime(clip.name) > clip.duration - 0.4
    );
  }

  private onUpdate() {
    this.blendClips();
    
    // Debug current clip status
    if (this.currClip && Math.floor(getTime() * 2) % 60 === 0) { // Log every 30 frames
      const currentTime = this.animationPlayer.getClipCurrentTime(this.currClip.name);
      print(`[VehicleAnimationController] Current clip: ${this.currClip.name}, Time: ${currentTime.toFixed(2)}s/${this.currClip.duration.toFixed(2)}s, Weight: ${this.currClip.weight.toFixed(2)}`);
    }
  }

  // Public methods for external control
  public getCurrentAnimationState(): string {
    if (!this.currClip) return "none";
    
    if (this.currClip.name === this.hoverClip.name) return "hover";
    if (this.currClip.name === this.idleClip.name) return "idle";
    
    return "unknown";
  }

  public getAnimationPlayer(): AnimationPlayer {
    return this.animationPlayer;
  }

  /**
   * Sync animation with vehicle controller flight state
   * @param flightState - Current flight state from VehicleController
   */
  public syncWithFlightState(flightState: string): void {
    const currentState = this.getCurrentAnimationState();
    const targetAnimationState = this.mapFlightStateToAnimationState(flightState);
    
    // Only change animation if state doesn't match - avoid redundant calls
    if (currentState !== targetAnimationState) {
      print(`[VehicleAnimationController] State Change: ${currentState} -> ${targetAnimationState} (flight: ${flightState})`);
      
      switch (flightState) {
        case "grounded":
          // Play hover animation even when grounded for continuous movement
          if (currentState !== "hover") this.playHoverAnimation();
          break;
        case "flying":
          if (currentState !== "hover") this.playHoverAnimation();
          break;
        default:
          print(`[VehicleAnimationController] Unknown flight state: ${flightState}`);
      }
    }
  }
  
  /**
   * Map flight state to expected animation state for comparison
   */
  private mapFlightStateToAnimationState(flightState: string): string {
    switch (flightState) {
      case "grounded": return "hover"; // Changed from "idle" to "hover"
      case "flying": return "hover";
      default: return "unknown";
    }
  }

  /**
   * Update animation timing parameters at runtime
   * Call this after changing timing values to recreate clips
   */
  public updateAnimationTiming(): void {
    print("[VehicleAnimationController] Updating animation timing...");
    
    // Clear existing clips
    this.clips.forEach(clip => {
      if (clip) {
        this.animationPlayer.removeClip(clip.name);
      }
    });
    this.clips = [];
    
    // Recreate clips with new timing
    this.createAllAnimationClips();
    
    // Restart with hover for continuous animation
    this.playHoverAnimation();
  }
}
