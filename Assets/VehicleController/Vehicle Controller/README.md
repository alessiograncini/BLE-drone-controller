# Vehicle Controller

The Vehicle Controller Component is a modular, customizable movement system designed to support various gameplay
formats, including third-person, first-person, side-scroller, and top-down perspectives. It provides a non-physics-based
movement model with optional physics interactions, allowing for smooth, responsive controls without physics body
dependencies.

## Usage

1. Add to a scene and add Bitmoji 3D component on the same SceneObject as Vehicle Controller.
2. Enable Adapt to Mixamo for Bitmoji 3D.
3. Select Tracking camera for Input Control Type Joystick (camera which render vehicle controller).

All updates to vehicle controller (for example, calling move API) and environment (for example, moving colliders, etc)
should be performed on UpdateEvent, not LateUpdateEvent.

Vehicle's scale and position will not be changed in runtime by updating Transform, in order to change its position
please use setPosition API.

## Inputs

| Name                         | Type                        | Description                                                                                                                                                                                                                            |
|------------------------------|-----------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| trackingCamera               | Camera                      | Camera which renders character controller                                                                                                                                                                                              |
| moveSpeed                    | number                      | Controls how fast the character moves                                                                                                                                                                                                  |
| sprintSpeed                  | number                      | Controls how fast the character runs                                                                                                                                                                                                   |
| acceleration                 | number                      | Determines how quickly the character reaches full speed                                                                                                                                                                                |
| deceleration                 | number                      | Defines how quickly the character slows down when input stops                                                                                                                                                                          |
| minMoveDistance              | number                      | Defines the smallest movement distance before applying updates                                                                                                                                                                         |
| autoFaceMovementDirection    | number                      | Determines if the character automatically rotates to match the movement direction                                                                                                                                                      |
| rotationSmoothing            | number                      | Defines how smoothly the character rotates towards movement direction, from 0 to 1                                                                                                                                                     |
| inputControlType             | None or Joystick            | If None is selected, user can move character controller manually with move(direction: vec3): void API. If joystick is enabled character will be moved using joystick                                                                   |
| joystickPosition             | Free, Left, Right or Custom | Sets position of joystick. If Free is selected, joystick appears each time when user touches screen in that position                                                                                                                   |
| interactiveArea              | InteractionComponent        | Interactive Area defines screen area where joystick may appear with Free position type. If configured, it appears only when a touch starts within this area. Otherwise, it can appear anywhere on screen.                              |
| joystickParent               | SceneObject                 | Parent of joystick in case Custom is selected for joystickPosition. Should have ScreenTransform                                                                                                                                        |
| sensitivity                  | number                      | Adjusts how responsive joystick input is.                                                                                                                                                                                              |
| deadZone                     | number                      | Size of the central region around the stick’s neutral position where small movements are ignored to prevent unintended input.                                                                                                          |
| renderOrder                  | number                      | Render order of joystick                                                                                                                                                                                                               |
| lockXAxis                    | boolean                     | Disables movement along the X axis                                                                                                                                                                                                     |
| lockYAxis                    | boolean                     | Disables movement along the Y axis                                                                                                                                                                                                     |
| lockZAxis                    | boolean                     | Disables movement along the Z axis                                                                                                                                                                                                     |
| showCollider                 | boolean                     | Makes character controller collider visible                                                                                                                                                                                            |
| groundCheckDistance          | number                      | Defines how far the system looks below and above the character to detect ground.                                                                                                                                                       |
| slopeLimit                   | number                      | Limits movement on steep inclines to prevent unnatural climbing                                                                                                                                                                        |
| stepHeight                   | number                      | Maximum step height when climbing a step                                                                                                                                                                                               |
| groundIsZero                 | boolean                     | Enables a virtual ground plane at Y = 0 for simplified grounding behavior without requiring floor colliders.                                                                                                                           |
| colliderHeight               | number                      | Length of capsule                                                                                                                                                                                                                      |
| colliderRadius               | number                      | Radius of capsule                                                                                                                                                                                                                      |
| colliderCenter               | vec3                        | Offset of capsule                                                                                                                                                                                                                      |
| gravity                      | number                      | Controls how fast the character falls                                                                                                                                                                                                  |
| airControl                   | number                      | Determines how much movement influence the player has mid-air                                                                                                                                                                          |
| idleAnimation.animationAsset | AnimationAsset              | Animation asset for idle animation                                                                                                                                                                                                     |
| idleAnimation.playbackSpeed  | number                      | Playback speed of idle animation                                                                                                                                                                                                       |
| moveAnimationConfigs         | MoveAnimationConfig[]       | Array of configs to setup animations for movement. Each config has minCharacterSpeed: number - min speed to play animation, animationAsset: AnimationAsset - animation asset for animation, playbackSpeed: number - speed of animation |

## API

| Name                                          | Description                                                                                                                                                          |
|-----------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `move(direction: vec3)`: void                 | Moves the character in the specified direction. Y value will be ignored. To use this API to set character direction manually, please set Input Control Type to None. |
| `stopMovement()`: void                        | Immediately stops character movement.                                                                                                                                |
| `setPosition(position: vec3)`: void           | Teleports the character to a specific world position.                                                                                                                |
| `getPosition()`: vec3                         | Returns the current world position of the character.                                                                                                                 |
| `setRotation(rotation: quat)`: void           | Sets the character's facing rotation. Will rotate character only around y axis.                                                                                      |
| `getRotation()`: quat                         | Gets the character's current rotation.                                                                                                                               |
| `getDirection()`: vec3                        | Returns the current movement direction.                                                                                                                              |
| `setSprintEnabled(enabled: boolean)`: void    | If true, enables sprinting speed, disables otherwise.                                                                                                                |
| `isSprinting()`: boolean                      | Returns true if sprint is currently active.                                                                                                                          |
| `setMoveSpeed(speed: number)`: void           | Sets the character's base movement speed.                                                                                                                            |
| `getMoveSpeed()`: number                      | Returns the current base movement speed.                                                                                                                             |
| `setSprintSpeed(speed: number)`: void         | Sets the character's sprint speed.                                                                                                                                   |
| `getSprintSpeed()`: number                    | Returns the current sprint speed.                                                                                                                                    |
| `isGrounded()`: boolean                       | Returns true if the character is currently grounded.                                                                                                                 |
| `isMoving()`: boolean                         | Returns true if the character is currently moving.                                                                                                                   |
| `getVelocity()`: vec3                         | Returns the character's current velocity vector.                                                                                                                     |
| `setAutoFaceMovement(enabled: boolean)`: void | Enables or disables auto-facing toward movement direction.                                                                                                           |
| `getAutoFaceMovement()`: boolean              | Returns whether auto-facing movement is enabled.                                                                                                                     |
| `setAcceleration(value: number)`: void        | Sets the acceleration                                                                                                                                                |
| `getAcceleration()`: number                   | Returns the acceleration                                                                                                                                             |
| `setDeceleration(value: number)`: void        | Sets the deceleration                                                                                                                                                |
| `getDeceleration()`: number                   | Returns the deceleration                                                                                                                                             |
| `setShowCollider(value: boolean)`: void       | If true is set character's collider is visible                                                                                                                       |
| `getShowCollider()`: boolean                  | Returns whether character's collider is visible                                                                                                                      |
| `setLockXAxis(enabled: boolean)`: void        | Enables or disables movement along the X axis.                                                                                                                       |
| `getLockXAxis()`: boolean                     | Returns whether movement along the X axis is currently locked.                                                                                                       |
| `setLockYAxis(enabled: boolean)`: void        | Enables or disables movement along the Y axis.                                                                                                                       |
| `getLockYAxis()`: boolean                     | Returns whether movement along the Y axis is currently locked.                                                                                                       |
| `setLockZAxis(enabled: boolean)`: void        | Enables or disables movement along the Z axis.                                                                                                                       |
| `getLockZAxis()`: boolean                     | Returns whether movement along the Z axis is currently locked.                                                                                                       |

## API Events

| Name                                                     | Description                                                      |
|----------------------------------------------------------|------------------------------------------------------------------|
| onCollisionEnter: event1<CollisionEnterEventArgs, void>  | Triggered when character starts colliding with another collider. |
| onCollisionStay(): event1<CollisionEnterEventArgs, void> | Triggered while character remains in collision.                  |
| onCollisionExit: event1<CollisionEnterEventArgs, void>   | Triggered when character exits a collision.                      |
| onOverlapEnter(): event1<OverlapEnterEventArgs, void>    | Triggered when character enters an overlap volume.               |
| onOverlapStay(): event1<OverlapEnterEventArgs, void>     | Triggered while character remains in overlap volumes.            |
| onOverlapExit(): event1<OverlapEnterEventArgs, void>     | Triggered when character exits an overlap volume.                |
