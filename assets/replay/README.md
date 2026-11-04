# ActiveScale episode excerpts for scene calibration

These two excerpts were downloaded from the author's public ActiveScale dataset at
https://modelscope.cn/datasets/shuai302/ActiveScale . The source README declares
Apache-2.0. Source revision is recorded inside each JSON.

- `backpack/episode_128.hdf5` contains 657 synchronized samples at 30 Hz (21.9 seconds). Instruction: Take a bottle out of the backpack and put it on the table.
- `box/episode_42.hdf5` contains 501 synchronized samples at 30 Hz (16.7 seconds). Instruction: Pick up the blue cookie box from the middle shelf of the shelving unit on the left and place it on the brown box on the left.

The JSONs preserve all recorded qpos samples (21 float values). `armOrder` is
`left,right,mid`. Each arm has six hinge angles in radians followed by a raw
gripper driver signal. The author confirmed that 0 is fully closed and 0.1 is fully open.
The preview normalizes this interval to the vendor mesh's 0–35 mm travel per jaw.
The middle gripper signal is constant and its finger meshes are omitted.

`cameraPoses` and `eefPoses` preserve the source's `*_in_unified/*/quat`
arrays. Positions are meters. Pose order is `[x,y,z,qx,qy,qz,qw]`. These are
absolute poses in the robot unified reference frame. The paper defines its
orientation as that of the middle arm base and its origin 0.25 m below that
base. Intrinsics K/D/P/R and the planar base command are also included.

The source has no per-frame timestamp dataset. Relative playback time is
sample index / the recorded 30 Hz frame rate. Each JPEG is the first actual
frame of the corresponding embedded MP4 stream (640x480 RGB), decoded from a
small byte range. The complete videos and HDF5 files were not downloaded.

The real tabletop/shelf/backpack poses, camera mounting extrinsics and exact
arm mounting transforms still need to be matched to the author's setup before
claiming a calibrated physical scene replay. The excerpts are real recorded
robot motion, not generated or simulated trajectories.
