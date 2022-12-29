/// <reference path="libs/js/action.js" />
/// <reference path="libs/js/stream-deck.js" />

const ns = 'llc.sauce.sauce4zwift';
const actions = {
    'reset-stats': onResetStats,
    'lap': onLap,
    'hide-windows': onHideWindows,
    'show-windows': onShowWindows,
};


async function rpc(cmd, ...args) {
    const r = await fetch(`http://localhost:1080/api/rpc/v1/${cmd}/${args.join('/')}`);
    if (!r.ok) {
        throw new Error(await r.text());
    }
    return await r.json();
}


async function onResetStats(ev) {
    console.info(ev);
    await rpc('resetStats');
}


async function onLap(ev) {
    console.info(ev);
    await rpc('startLap');
}


async function onHideWindows(ev) {
    console.info(ev);
    await rpc('hideAllWindows');
}


async function onShowWindows(ev) {
    console.info(ev);
    await rpc('showAllWindows');
}


for (const [key, callback] of Object.entries(actions)) {
    const action = new Action(`${ns}.${key}`);
    action.onKeyUp(callback);
}

$SD.onConnected(ev => {
	console.log('Stream Deck connected!', ev);
});
