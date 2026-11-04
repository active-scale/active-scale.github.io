# ActiveScale website design preferences

User-approved preferences collected while designing this project. Apply these to future edits and use the same principles when the user asks to reuse this website's style.

## Visual identity

- Preserve the original ActiveScale wordmark and purple identity. Keep the simulation environment neutral and realistic, with silver/black robot materials.
- Use light backgrounds that blend gradually with scroll. Avoid abrupt chapter color bands, near-black purple, and a separately painted sidebar panel.
- Keep the wordmark immediately above the side contents navigation. The current chapter is italic; a draggable robot marks reading progress. Clicking the robot starts automatic reading; manual scrolling or interaction stops it.
- Use tasteful handwriting for short expressive phrases and hints, not dense explanatory copy. Reference: https://talkingtorobots.com/yonatanbisk.html. Preserve readable body typography.
- Hovered cards should lift slightly with soft shadows. Make the interactive element feel responsive without moving diagram connections away from their endpoints.
- Preserve generous and consistent inner padding around images, titles, and captions. Leave clearance around a card for its lifted position and shadow; hovering must never make content appear flush with an edge.
- Keep the side contents inset from the viewport edge. Move the wordmark, drag hint, contents, and robot handle together when adjusting this inset; widening the sidebar region alone is insufficient. In the hero, place the full paper title below the expressive main heading; omit a repeated recipe tagline above the author information.

## Motion and interaction

- Reveal content as it enters the viewport with a gentle fade and upward movement. Start the associated demonstration when it becomes visible so visitors do not miss the beginning.
- Re-arm scroll entrances only after content fully leaves the viewport. Start chart growth when the actual bar rows are visible; clicks, chapter selection, and navigation must not permanently consume later entrances.
- Pause offscreen animations and videos. Respect reduced-motion preferences. Keep content available if scripts or animations are unavailable.
- Let the hardware mounting view orbit slowly on its own. Manual dragging takes priority, followed by a brief idle delay before automatic orbit resumes from the current view.
- Slowly rotate all three hardware component previews. Show the stock Cobot Magic with the same initial side-arm joint poses and base orientations as AMP.
- Use a robot emoji or small running-robot animation for timeline handles and reading progress. Retain native dragging and keyboard interaction.
- Model stages cycle automatically until the visitor selects a stage. Evaluation task videos progress in order until the visitor chooses a task or interacts with its timeline.
- Teleoperation motion should be immediately legible: sufficiently large base movement and turning, clear hand/head motion, brisk pacing, and live pose readouts. Preserve Replay; omit speed settings.
- Keep simulations physically credible: verify camera orientation, gripper contact, object support, and robot/table clearance. Avoid floating objects, clipping, and arbitrary block stand-ins when meaningful objects are available.

## Layout and explanation

- Tell the story in order: motivation, hardware, data recipe, model, evaluation, conclusion/limitations, citation, emerging active-perception reading list.
- Use consistent, intentional heading breaks. Keep short phrases such as “to look around” together; avoid isolated last words and text clipping on narrow screens.
- Prefer intuitive output animations and clear module colors to implementation details. Model heads need a role, name, supervision signal, and a recognizable icon; compactness must preserve visual explanations.
- Show the action trajectory in the Action chunk output. Keep camera tokens visibly connected to camera-pose reconstruction and the attention mask visible near the architecture.
- Represent wrist views, robot state, and language separately in the architecture and attention mask, with independent selection and highlighting.
- Avoid excess copy, empty vertical space, tiny icons, repeated labels, hidden major sections, and gratuitous collapsibles. Keep related controls near their heading.
- Distinguish evaluation conditions from metrics. Show all tasks and their average for each comparison; success and task progress are separate metrics. Explain progress using the paper's scoring rubric.
- Hardware videos may play as fixed demonstrations. Use official dataset previews and institution logos; do not substitute paper task-definition images for diverse robot datasets.
- Keep the CMU RI and HKUST Guangzhou logos side by side at a clearly legible size. Place the teleoperation Easter egg button on the left and label it “Click to try a mobile manipulation task”.
- Preserve factual scope, original experimental results, and explicitly preliminary observations. Do not invent experiments, scaling results, or evidence.

## Verification and delivery

- Inspect desktop and mobile layouts, hovered cards, scroll entrances, auto-cycle/manual override, replay, and timeline interaction.
- Publish changes to the existing GitHub Pages repository when authorized; verify deployment and provide a fresh preview link.
