# Replay collision checks

After changes to the robot assembly, table geometry, replay calibration, or recorded joint interpolation, run:

```sh
node checks/pot-table-collision.mjs
```

This loads the actual website meshes and scene. It checks every recorded Pot pose and each half-frame (1,681 poses at 60 Hz) against the tabletop and four table legs. A geometry BVH filters candidates; individual world-space triangles use Three.js triangle/box SAT. A second pass expands the table boxes by 20 mm. The command fails on any hit, initial pot/lid overhang, or recorded qpos mutation. Results go to `checks/last-pot-table-collision.json`.

Also inspect the replay from the side in the browser. This is a check of the rendered geometry at sampled times, not a continuous collision guarantee or a physical calibration of the real robot. Intended gripper/object contact and the shelf are outside this robot/table check.

## Prop contact and motivation scenes

- `node checks/pot-lid-grip.mjs` checks knob contact against both real fingers, then checks the lid crown, neck, pot wall/rim, table, and complete right arm through all 1,681 sampled poses. It verifies continuous pickup/release and detects the former 24.9 s lid/rim intersection. The crown and knob dimensions are a fitted visual reconstruction, not measured hardware dimensions.
- `node checks/viewpoint-scenes.mjs` checks that the bin really occludes the bottle, the shelf mug starts outside the optical view, both targets become visible, and sampled robot meshes stay clear of the scene props.

- `node checks/teleop-task.mjs` checks the 24-second illustrative base/pick-and-place loop through 401 samples: mounted-camera aim and target visibility, actual pose/base readouts, controller mapping, table/leg clearance, joint limits, gripper contact, and loop continuity.

These are geometric checks of the displayed scene. The illustrative motion does not use contact dynamics.
