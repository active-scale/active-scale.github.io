# ActiveScale recorded demonstrations

Source is the author's public [ActiveScale dataset](https://modelscope.cn/datasets/shuai302/ActiveScale).
The source README declares Apache-2.0. Each JSON records the source path and revision.

## Pot, episode 38

The main replay uses `pot/episode_38.hdf5` from revision
`0e3dd1fec24e48e68aca389c8c40c8a3a28171d2`. It has 841 samples at 30 Hz.
Its instruction is to take the onion from the left shelf, put it into the pot on the
middle table, and cover the pot with the lid.

All 841 samples of joint position, camera pose, end-effector pose and base command
are preserved in `pot-episode-38.json`. All three videos are the complete embedded
head, left-wrist and right-wrist streams from that same recording. They retain the
original 640×480 resolution, 30 fps cadence and frame count. The original lossless
RGB H.264 streams were re-encoded to browser-compatible YUV420 H.264 at CRF 23.
The website copies are visually compressed. No frames were added, removed or retimed.

The front video is the replay clock. Joint and camera pose sampling uses that
video time, and the other two videos are corrected if they drift more than 0.1 s.
Scrubbing seeks all streams and the 3D view to the same relative time.

The scene's white table, metal pot, lid, onion and shelf are illustrative geometry.
Their positions have not been calibrated to the real tabletop. The rendered robot
follows the recorded joints within stock vendor geometry limits. The three videos
show the real scene. This is a dataset demonstration, independent of the autonomous
evaluation clips shown beside quantitative results.

## Shared representation

`armOrder` is `left,right,mid`. Each arm has six hinge angles in radians followed
by a raw gripper driver signal. The author confirmed 0 = closed and 0.1 = fully
open. The preview maps this interval to 0–35 mm travel per jaw. The middle arm's
finger meshes are omitted.

`cameraPoses` and `eefPoses` preserve the source's `*_in_unified/*/quat` arrays,
with position in meters and pose order `[x,y,z,qx,qy,qz,qw]`. The robot unified
frame has the middle-arm base orientation and an origin 0.25 m below that base.
Original intrinsics K/D/P/R are included. No per-frame timestamps were present,
so relative time is sample index divided by the recorded 30 Hz frame rate.

## Older compact excerpts

Backpack episode 128 (657 samples) and Box episode 42 (501 samples) remain for
existing compact comparison callers. Those older excerpts have joint/pose JSONs
and first-frame JPEGs, and their full camera videos were not downloaded. The main
public replay uses Pot, whose three streams are complete.
