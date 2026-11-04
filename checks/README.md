# Replay collision checks

After changes to the robot assembly, table geometry, replay calibration, or recorded joint interpolation, run:

```sh
node checks/pot-table-collision.mjs
```

This loads the actual website meshes and scene. It checks every recorded Pot pose and each half-frame (1,681 poses at 60 Hz) against the tabletop and four table legs. A geometry BVH filters candidates; individual world-space triangles use Three.js triangle/box SAT. A second pass expands the table boxes by 20 mm. The command fails on any hit, initial pot/lid overhang, or recorded qpos mutation. Results go to `checks/last-pot-table-collision.json`.

Also inspect the replay from the side in the browser. This is a check of the rendered geometry at sampled times, not a continuous collision guarantee or a physical calibration of the real robot. Intended gripper/object contact and the shelf are outside this robot/table check.
