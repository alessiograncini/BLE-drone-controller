# Animation Player Documentation for Spectacles

## Overview

The Animation Player is a component that handles animations created by external 3D creation software. It provides a modern animation system that replaced the legacy Animation Mixer starting from Lens Studio 5.0.10.

The Animation Player component manages playback of Animation Clips, allowing you to play, stop, resume, and subscribe to animation events with precise control over timing, blending, and playback parameters.

## Prerequisites

- Lens Studio v5.0.10 or later for Animation Player support
- Animation assets imported from 3D creation software
- SceneObjects with proper joint naming for animation targeting

## Animation System Architecture

The Animation Player system consists of four main components:

1. **Animation Player Component** - Controls and plays Animation Clips
2. **Animation Clips** - Contains references to Animation Assets with playback settings
3. **Animation Assets** - Contains Animation Property Layers and event hooks
4. **Animation Property Layers** - Contains specific animation properties (position, rotation, scale, etc.)

## Animation Player Component

The Animation Player component is the main controller for animation playback. It manages multiple Animation Clips and provides comprehensive control over animation behavior.

### Component Properties

| Property | Type | Description |
|----------|------|-------------|
| **Autoplay** | Boolean | Specifies if clips should play automatically on initialization |
| **Animation Clips** | Array | Collection of Animation Clips managed by this player |

### Adding Animation Clips

Animation Clips can be added to the Animation Player through the Inspector panel:

1. Select the Animation Player component
2. In the Animation Clips array, press **+ Add Value**
3. Configure the new Animation Clip properties

## Animation Clips

Animation Clips define how a specific Animation Asset should be played back. Each clip contains playback parameters and references to the underlying Animation Asset.

### Clip Properties

| Property | Type | Range | Description |
|----------|------|-------|-------------|
| **Animation Asset** | Asset Reference | - | Points to the Animation Asset to be played |
| **Name** | String | - | Unique identifier for referencing the clip in code |
| **Weight** | Float | [0.0, 1.0] | Strength of animation clip contribution during blending |
| **Begin** | Float | Time (seconds) | Start time of the clip based on export FPS |
| **End** | Float | Time (seconds) | End time of the clip based on export FPS |
| **Reversed** | Boolean | - | Whether the clip should play in reverse |
| **Disabled** | Boolean | - | Whether the clip has any influence on the Animation Player |

### Blend Types

Animation clips support different blending modes when multiple animations are active:

#### Default Blending
- **Behavior**: Completely overrides any existing joint influence
- **Use Case**: Primary animations that should take full control
- **Priority**: This animation takes precedence over others

#### Additive Blending
- **Behavior**: Adds weight to existing animation influence on joints
- **Use Case**: Secondary animations that enhance primary motion
- **Blending**: Combines with other active animations

### Scale Accumulation

Determines how animation values are applied to joints:

#### Multiply Mode
- **Behavior**: Multiplies values with currently applied joint values
- **Effect**: Scales existing transformations
- **Use Case**: Scaling or modifying existing animations

#### Additive Mode
- **Behavior**: Adds animation values to currently applied values
- **Effect**: Combines transformations additively
- **Use Case**: Layering multiple animation effects

## Animation Assets

Animation Assets are created when importing 3D animations and contain the actual animation data organized into Property Layers.

### Asset Structure

- **Location**: Found in the Asset Browser panel
- **Creation**: Automatically generated when importing animated 3D files
- **Content**: Multiple Animation Property Layers
- **Events**: Support for animation-triggered events

### Joint Targeting

Animation targeting is based on joint names:

- **Requirement**: Every object must have a unique name
- **Matching**: Animations target joints by name matching
- **Retargeting**: Animations automatically retarget to objects with matching structure

## Animation Property Layers

Property Layers contain specific animation data for different transformation types.

### Layer Types

| Property Type | Description | Common Use Cases |
|---------------|-------------|------------------|
| **Position** | Translation data | Movement, displacement |
| **Rotation** | Rotation data | Character rotation, spinning objects |
| **Scale** | Scaling data | Size changes, breathing effects |
| **Custom Properties** | Arbitrary numeric data | Font size, material properties, custom effects |

### Data Structure

Animation Property Layers store numeric sequences that describe property states over time. This flexible structure allows animation data to be applied to various contexts beyond traditional 3D transformations.

## API Reference

### AnimationPlayer Component

**Scripting Name**: `Component.AnimationPlayer`  
**Availability**: Lens Studio v5.0.10+  
**Inherits from**: Component

The AnimationPlayer component provides comprehensive control over animation playback with support for multiple clips, blending, and event handling.

### Methods

#### Clip Management

| Method | Parameters | Return Type | Description |
|--------|------------|-------------|-------------|
| `addClip()` | `clip: AnimationClip` | `void` | Adds a clip to the player. Replaces existing clip if one exists |
| `removeClip()` | `name: String` | `void` | Removes a clip from the player |
| `getClip()` | `name: String` | `AnimationClip` | Gets a clip by name. Returns null if not found |

#### Playback Control

| Method | Parameters | Return Type | Description |
|--------|------------|-------------|-------------|
| `playAll()` | - | `void` | Plays all clips |
| `playClipAt()` | `name: String, time: Number` | `void` | Plays clip starting from specified time |
| `pauseAll()` | - | `void` | Pauses all clips |
| `pauseClip()` | `name: String` | `void` | Pauses specific clip |
| `resumeAll()` | - | `void` | Resumes all clips |
| `resumeClip()` | `name: String` | `void` | Resumes specific clip |
| `stopAll()` | - | `void` | Stops all clips and resets time to 0 |
| `stopClip()` | `name: String` | `void` | Stops specific clip and resets time to 0 |

#### State Queries

| Method | Parameters | Return Type | Description |
|--------|------------|-------------|-------------|
| `getActiveClips()` | - | `String[]` | Returns names of currently playing clips |
| `getInactiveClips()` | - | `String[]` | Returns names of currently inactive clips |
| `getClipIsPlaying()` | `name: String` | `Boolean` | Returns if clip is currently playing |
| `getClipEnabled()` | `name: String` | `Boolean` | Returns if clip is enabled for playback |
| `getClipCurrentTime()` | `name: String` | `Number` | Returns current time position of clip |

#### Utility Methods

| Method | Parameters | Return Type | Description |
|--------|------------|-------------|-------------|
| `setClipEnabled()` | `name: String, enabled: Boolean` | `void` | Enables or disables clip |
| `forceUpdate()` | `deltaTime: Number` | `void` | Forces animation sampling and event firing |

### Properties

| Property | Type | Access | Description |
|----------|------|--------|-------------|
| `clips` | `AnimationClip[]` | Read-only | Array of animation clips |
| `onEvent` | `Event` | Read-only | Event for listening to animation events |

### Events

The Animation Player supports event binding for animation-triggered events:

```typescript
// Bind to animation events
animationPlayer.onEvent.add((args) => {
    print(`Animation event: ${args.eventName} at time ${args.time}`);
});
```

## Usage Examples

### Basic Animation Playback

```typescript
@component
export class BasicAnimationExample extends BaseScriptComponent {
    @input
    animationPlayer: AnimationPlayer;
    
    onAwake() {
        // Play a specific clip
        this.animationPlayer.playClipAt("walkCycle", 0);
        
        // Check if clip is playing
        if (this.animationPlayer.getClipIsPlaying("walkCycle")) {
            print("Walk cycle is playing");
        }
    }
}
```

### Animation Blending and Transitions

```typescript
@component
export class AnimationBlendingExample extends BaseScriptComponent {
    @input
    animationPlayer: AnimationPlayer;
    @input
    transitionDuration: number = 1.0;
    
    private isTransitioning: boolean = false;
    private accumulatedTime: number = 0;
    private targetWeight: number = 1;
    
    onAwake() {
        this.createEvent("TapEvent").bind(() => {
            this.transitionToClip("runCycle");
        });
        
        this.createEvent("UpdateEvent").bind(() => {
            this.updateTransition();
        });
    }
    
    transitionToClip(clipName: string) {
        if (!this.isTransitioning) {
            this.animationPlayer.playClipAt(clipName, 0);
            this.isTransitioning = true;
            this.accumulatedTime = 0;
        }
    }
    
    updateTransition() {
        if (this.isTransitioning) {
            this.accumulatedTime += getDeltaTime();
            
            if (this.accumulatedTime >= this.transitionDuration) {
                this.isTransitioning = false;
                return;
            }
            
            // Smooth transition using lerp
            const progress = this.accumulatedTime / this.transitionDuration;
            const clip = this.animationPlayer.getClip("runCycle");
            if (clip) {
                clip.weight = this.lerp(0, this.targetWeight, progress);
            }
        }
    }
    
    private lerp(a: number, b: number, t: number): number {
        return a * (1.0 - t) + b * t;
    }
}
```

### Advanced Animation Control

```typescript
@component
export class AdvancedAnimationExample extends BaseScriptComponent {
    @input
    animationPlayer: AnimationPlayer;
    
    onAwake() {
        // Setup animation events
        this.animationPlayer.onEvent.add((args) => {
            this.handleAnimationEvent(args);
        });
        
        // Play multiple clips with different weights
        this.setupAnimationLayers();
    }
    
    setupAnimationLayers() {
        // Base animation
        this.animationPlayer.playClipAt("idle", 0);
        const idleClip = this.animationPlayer.getClip("idle");
        if (idleClip) {
            idleClip.weight = 0.7;
        }
        
        // Additive animation
        this.animationPlayer.playClipAt("breathing", 0);
        const breathingClip = this.animationPlayer.getClip("breathing");
        if (breathingClip) {
            breathingClip.weight = 0.3;
        }
    }
    
    handleAnimationEvent(args: any) {
        switch (args.eventName) {
            case "footstep":
                this.playFootstepSound();
                break;
            case "jump_start":
                this.triggerJumpEffect();
                break;
        }
    }
    
    playFootstepSound() {
        // Play footstep audio
        print("Playing footstep sound");
    }
    
    triggerJumpEffect() {
        // Trigger jump particle effect
        print("Triggering jump effect");
    }
}
```

## Best Practices

### Performance Optimization

- **Clip Management**: Remove unused clips to reduce memory usage
- **Weight Optimization**: Set unused clip weights to 0 instead of pausing
- **Event Handling**: Unbind event listeners when no longer needed

### Animation Quality

- **Smooth Transitions**: Use gradual weight changes for seamless blending
- **Proper Timing**: Ensure clip timing matches intended playback speed
- **Layer Organization**: Use appropriate blend types for different animation layers

### Debugging

- **State Monitoring**: Use `getActiveClips()` to monitor current playback state
- **Time Tracking**: Monitor `getClipCurrentTime()` for timing issues
- **Event Logging**: Log animation events for debugging complex sequences

## Known Limitations

- **Legacy Compatibility**: Projects using AnimationMixer require migration to AnimationPlayer
- **Joint Naming**: Animation targeting requires unique joint names across the hierarchy
- **Performance**: Large numbers of active clips may impact performance on lower-end devices
