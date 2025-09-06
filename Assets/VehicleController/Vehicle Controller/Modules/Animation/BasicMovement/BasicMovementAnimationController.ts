import { BasicMovementAnimationControllerConfig } from "./BasicMovementAnimationControllerConfig";
import { type Disposable, Utils } from "../../Utils/Utils";
import delay = Utils.delay;
import CompositeDisposable = Utils.CompositeDisposable;
import { Event } from "../../Utils/Event";

const SPEED_THRESHOLD = 0.05;
const MOVE_ANIMATION_TRANSITION_TIME = 0.4;
const DEFAULT_ANIMATION_TRANSITION_TIME = 0.2;
const RETURN_TO_IDLE_TRANSITION_TIME = 0.4;

type MoveAnimationClipData = {
  minSpeed: number;
  maxSpeed: number;
  clip: AnimationClip;
  originalPlaybackSpeed: number;
};

export class BasicMovementAnimationController {
  private readonly animationPlayer: AnimationPlayer;

  private readonly idleClip: AnimationClip = null;
  private readonly jumpClip: AnimationClip = null;

  private readonly characterRootHostingScript: ScriptComponent;
  private readonly updateDataEvent = new Event<{ deltaTime: number }>();
  private readonly updateCharacterEvent = new Event<{ deltaTime: number }>();

  private readonly moveAnimationClipsData: MoveAnimationClipData[];
  private isMovementStateEnabled: boolean = true;
  private currentMoveAnimationClipData: MoveAnimationClipData;
  private currentTargetClip: AnimationClip = null;

  private currentClipDisposable = new CompositeDisposable();

  constructor(
    config: BasicMovementAnimationControllerConfig,
    characterRootSO: SceneObject
  ) {
    this.characterRootHostingScript = characterRootSO.createComponent("Script");

    this.animationPlayer = characterRootSO.createComponent("AnimationPlayer");

    this.idleClip = createClipFromAnimationConfig("Idle", config.idleAnimation);
    if (this.idleClip) {
      this.animationPlayer.addClip(this.idleClip);
      this.animationPlayer.playClip(this.idleClip.name);
    }

    this.moveAnimationClipsData = retrieveMoveAnimationClipsData(config);

    this.observe();
    this.returnToIdle();
  }

  reset(): void {
    this.returnToIdle();
  }

  performJump() {
    if (!this.jumpClip) {
      return;
    }
    this.exitMoveState();
    this.startClip(this.jumpClip, DEFAULT_ANIMATION_TRANSITION_TIME);
    const clipDuration = this.jumpClip.duration / this.jumpClip.playbackSpeed;
    const timeToReturnToIdle = Math.max(
      0,
      clipDuration - RETURN_TO_IDLE_TRANSITION_TIME
    );
    this.currentClipDisposable.add(
      delay(this.characterRootHostingScript, timeToReturnToIdle, () => {
        this.isMovementStateEnabled = true;
        this.returnToIdle();
      })
    );
  }

  updateMoveAnimation(speed: number) {
    if (this.hasMoveAnimation && this.isMovementStateEnabled) {
      const currentClip = this.currentMoveAnimationClipData;
      const isInCurrentAnimationRange =
        currentClip &&
        speed >= currentClip.minSpeed &&
        speed <= currentClip.maxSpeed;
      if (!isInCurrentAnimationRange) {
        const newClip = this.moveAnimationClipsData.find(
          (clip) => speed >= clip.minSpeed && speed <= clip.maxSpeed
        );
        if (!newClip) {
          this.returnToIdle();
          return;
        }
        this.currentMoveAnimationClipData = newClip;

        if (currentClip !== newClip) {
          this.startClip(newClip.clip, MOVE_ANIMATION_TRANSITION_TIME);
        }
      }
      remapAnimationPlaybackSpeed(this.currentMoveAnimationClipData);
    }

    function remapAnimationPlaybackSpeed(clipData: MoveAnimationClipData) {
      clipData.clip.playbackSpeed =
        clipData.originalPlaybackSpeed * (speed / clipData.minSpeed);
    }
  }

  bindSpeedProvider(speedProvider: { getSpeed: () => number }): Disposable {
    const callback = () => this.updateMoveAnimation(speedProvider.getSpeed());
    this.updateCharacterEvent.add(callback);
    return { dispose: () => this.updateCharacterEvent.remove(callback) };
  }

  protected observe() {
    this.characterRootHostingScript.createEvent("UpdateEvent").bind((event) => {
      this.updateDataEvent.trigger({ deltaTime: event.getDeltaTime() });
      this.updateCharacterEvent.trigger({ deltaTime: event.getDeltaTime() });
    });
    this.exitMoveState();
  }

  private get hasMoveAnimation(): boolean {
    return this.moveAnimationClipsData.length > 0;
  }

  private exitMoveState() {
    this.currentMoveAnimationClipData = null;
    this.isMovementStateEnabled = false;
  }

  private startClip(clip: AnimationClip, transitionTime: number) {
    if (clip && this.idleClip?.isSame(clip)) {
      this.returnToIdle();
      return;
    }
    if (clip && this.currentTargetClip?.isSame(clip)) {
      return;
    }
    this.currentTargetClip = clip;
    this.currentClipDisposable.dispose();

    if (clip) {
      this.animationPlayer.getClip(clip.name) &&
        this.animationPlayer.removeClip(clip.name);
      this.animationPlayer.addClip(clip);
      this.animationPlayer.playClip(clip.name);
      this.currentClipDisposable.add(
        Utils.startTween(
          this.characterRootHostingScript,
          transitionTime,
          (p) => {
            clip.weight = p;
          }
        )
      );
    }
  }

  private returnToIdle() {
    if (this.idleClip && this.currentTargetClip?.isSame(this.idleClip)) {
      return;
    }
    this.currentTargetClip = this.idleClip;

    this.isMovementStateEnabled = true;
    this.currentMoveAnimationClipData = null;

    this.currentClipDisposable.dispose();
    this.cleanupClips();
    const otherActiveClips = this.getActiveClips();
    const weightSetters: ((weight: number) => void)[] = [];
    for (const clip of otherActiveClips) {
      if (clip.name !== this.idleClip?.name) {
        const originalWeight = clip.weight;
        weightSetters.push((weight) => (clip.weight = originalWeight * weight));
      }
    }
    this.currentClipDisposable.add(
      Utils.startTween(
        this.characterRootHostingScript,
        RETURN_TO_IDLE_TRANSITION_TIME,
        (p) => {
          for (const setter of weightSetters) {
            setter(1 - p);
          }
        },
        () => {
          this.cleanupClips();
        }
      )
    );

    this.idleClip && this.animationPlayer.playClip(this.idleClip.name);
  }

  private cleanupClips() {
    const clips = this.getActiveClips();
    let weight = 0;
    for (let i = clips.length - 1; i >= 0; --i) {
      if (
        clips[i].name !== this.idleClip?.name &&
        (weight > 1 || clips[i].weight < 0.001)
      ) {
        this.animationPlayer.removeClip(clips[i].name);
      } else {
        weight += clips[i].weight;
      }
    }
  }

  private getActiveClips(): AnimationClip[] {
    return this.animationPlayer
      .getActiveClips()
      .map((clipName) => this.animationPlayer.getClip(clipName));
  }
}

// Helper functions

function retrieveMoveAnimationClipsData(
  config: BasicMovementAnimationControllerConfig
): MoveAnimationClipData[] {
  const data = config.moveAnimationConfigs
    .map((moveAnimationConfig, idx) => {
      const clip = createClipFromAnimationConfig(
        `Move${idx}`,
        moveAnimationConfig
      );
      if (clip) {
        const playbackSpeed = moveAnimationConfig.playbackSpeed;
        clip.playbackSpeed = playbackSpeed;
        return {
          minSpeed: moveAnimationConfig.minCharacterSpeed,
          maxSpeed: 0,
          clip: clip,
          originalPlaybackSpeed: playbackSpeed,
        };
      }
      return null;
    })
    .filter(Boolean)
    .sort((a, b) => a.minSpeed - b.minSpeed);

  if (data.length > 0) {
    data[data.length - 1].maxSpeed = Number.MAX_VALUE;
    for (let i = 0; i < data.length - 1; i++) {
      data[i].maxSpeed = data[i + 1].minSpeed + SPEED_THRESHOLD;
    }
  }
  return data;
}

function createClipFromAnimationConfig(
  animationName: string,
  animationConfig: { animationAsset: AnimationAsset; playbackSpeed: number }
): AnimationClip {
  if (!animationConfig.animationAsset) {
    return null;
  }
  const clip = AnimationClip.createFromAnimation(
    animationName,
    animationConfig.animationAsset
  );
  clip.playbackSpeed = animationConfig.playbackSpeed;

  return clip;
}
