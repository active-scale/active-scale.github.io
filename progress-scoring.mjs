// Table I / tab:tp-scoring in the Scaling H2R camera-ready manuscript.
const scoring = [
  ['Bag', [['Grasp backpack', .3], ['Grasp bottle', .3], ['Place bottle on table', .4]]],
  ['Drawer', [['Open drawer', .3], ['Grasp target object', .3], ['Place object on plate', .2], ['Close drawer', .2]]],
  ['Table', [['Grasp target object', .5], ['Place object in target bin', .5]]],
  ['Pot', [['Grasp target vegetable', .4], ['Place vegetable in pot', .2], ['Grasp lid', .2], ['Cover pot', .2]]],
  ['Box', [['Grasp target object', .5], ['Place object in target box', .5]]],
];

export function initProgressScoring() {
  const mount = document.getElementById('progress-definition');
  if (!mount) return;
  mount.className = 'tp-definition';
  mount.innerHTML = `
    <h3>What does Task Progress measure?</h3>
    <p>Each rollout earns the sum of credits for its completed stages. <strong>Task Progress</strong> averages these scores across 20 evaluation rollouts per task and method. <strong>Success Rate</strong> counts only rollouts satisfying every required stage and the final-state criterion.</p>
    <div class="tp-scoring-scroll"><table>
      <caption>Stage credits used in the paper</caption>
      <thead><tr><th scope="col">Task</th>${[1,2,3,4].map(i => `<th scope="col">Stage ${i}</th>`).join('')}</tr></thead>
      <tbody>${scoring.map(([name, stages]) => `<tr><th scope="row">${name}</th>${Array.from({length:4}, (_,i) => stages[i] ? `<td><span>${stages[i][0]}</span><b>${Math.round(stages[i][1]*100)}%</b></td>` : '<td class="tp-na">—</td>').join('')}</tr>`).join('')}</tbody>
    </table></div>
    <p class="tp-example"><strong>For example:</strong> grasping the backpack and bottle earns 60% progress, even if placing the bottle on the table fails. The rollout is still unsuccessful.</p>`;
}
