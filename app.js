
const ns = 'llc.sauce.sauce4zwift';
const actions = {
    'reset-stats': initResetStats,
    'lap': initLap,
    'show-hide-windows': initShowHideWindows,
};


class Button {
    constructor(action, key, context, meta) {
        this.action = action;
        this.key = key;
        this.context = context;
        this.meta = meta;
    }

    on(event, callback) {
        this.action.on(`${this.action.UUID}.${event}`, data => {
            if (data.context === this.context) {
                callback(data);
            }
        });
    }

    setTitle(title) {
        return $SD.setTitle(this.context, title);
    }

    setState(state) {
        return $SD.setState(this.context, state);
    }
}

async function _rpc(cmd, ...args) {
    const r = await fetch(`http://localhost:1080/api/rpc/v1/${cmd}`, {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify(args),
    });
    const envelope = await r.json();
    if (!envelope.success) {
        console.error('RPC Error:', envelope.error.stack);
        throw new Error(envelope.error.message);
    }
    return envelope.value;
}

const rpc = new Proxy({}, {get: (target, prop) => (...args) => _rpc(prop, ...args)});


async function initResetStats(button) {
    button.on('keyUp', rpc.resetStats);
}


async function initLap(button) {
    console.warn(button);
    let lapCount = 0;
    async function updateLaps() {
        ({lapCount} = await rpc.getAthleteStats('self'));
        button.setTitle(lapCount);
    }
    button.on('keyUp', async () => {
        await rpc.startLap();
        await updateLaps();
    });
    await updateLaps();
    setInterval(updateLaps, 5000);
}


async function initShowHideWindows(button) {
    let showing = true;
    button.on('keyUp', () => {
        showing = !showing;
        if (showing) {
            rpc.showAllWindows();
        } else {
            rpc.hideAllWindows();
        }
        button.setState(+showing);
    });
}


for (const [key, callback] of Object.entries(actions)) {
    const action = new Action(`${ns}.${key}`);
    action.onWillAppear(({context, ...meta}) => {
        const button = new Button(action, key, context, meta);
        callback(button);
    });
}

$SD.onApplicationDidLaunch(ev => {
    console.log('Application did launch', ev);
});

$SD.onConnected(ev => {
	console.log('Stream Deck connected!', ev);
});
