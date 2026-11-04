# AgileX geometry for ActiveScale preview

- PiPER link meshes and joint transforms are from the manufacturer’s [PiPER ROS repository](https://github.com/agilexrobotics/piper_ros/tree/noetic/src/piper_description). The MIT notice is in `PIPER-LICENSE.txt`. The local MJCF has relative paths adjusted to find these copies. `piper.json` transcribes the MJCF’s body tree and joint limits.
- Tracer 2 chassis, Cobot Magic frame, and Orbbec DaBai are simplified visual meshes from [AgileX Mobile ALOHA simulation v2.0.0](https://github.com/agilexrobotics/mobile_aloha_sim/tree/v2.0.0/aloha_new_description). Their COLLADA scene transforms are baked into the STL files. Vertex positions are snapped to 6 mm (chassis/frame) or 1.5 mm (camera) grids to keep interactive download sizes modest. The vendor package manifest explicitly includes its 3D models and declares `BSD`; the upstream manifest does not identify a BSD variant or provide a full notice. Source and transformation attribution are retained in `MOBILE_ALOHA-NOTICE.txt`.
- `cobot-magic.json` records stock assembly transforms from `aloha_tracer2_dabai_dark.urdf`. These define the chassis/frame and front arm mounting positions, not a calibrated ActiveScale reconstruction. The manufacturer's stock frame has structures for the rear leader arms and fixed camera.
- `loaders.js` loads the assets via Three.js + STLLoader supplied by the caller. It returns arm joint controls and named link frames. The default output is Three.js Y-up, with original vendor link coordinates preserved inside. Use `{ zUp: true }` if attaching arms directly to the chassis `zUp` node. Joint values are radians except prismatic gripper joints, which use meters. `{ gripper: false }` leaves the sixth link bare. `{ fingers: false }` retains the gripper body and omits both fingers.

## AMP assembly inputs

The paper describes a differential-drive Cobot Magic, two follower PiPER arms with wrist-mounted DaBai DC1 cameras, and a third PiPER arm carrying the independently actuated DaBai DC1. The custom steel column, camera-arm root pose and optical frame were not specified in the stock CAD.

For real-to-sim calibration, supply:

1. Chassis-to-column translation and yaw, column height and cross-section, and how the stock upper structure was modified.
2. Chassis-to-base transforms for the three PiPER arms (in meters and yaw/pitch/roll), and their approximate resting joint angles.
3. Camera-arm link-6-to-optical-center transform and camera field of view. Wrist extrinsics if showing wrist cameras.
4. Table/shelf/drawer dimensions and target placements, relative to a common floor or chassis frame.


The AMP frame removes the display and the upper upright. The stock lower support is retained up to 650 mm in frame-local coordinates. The replacement mast seats on that cut at chassis Z = 818 mm and follows the support's shaft centerline (approximately X = 177 mm, Y = 0). Its initial height is 300 mm. The PiPER cameras sit above the gripper modules and look along link 6 +Z. Exact camera offsets remain approximate.
