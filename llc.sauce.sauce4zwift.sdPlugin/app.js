const ns = 'llc.sauce.sauce4zwift';
const actions = {
    'reset-stats': initResetStats,
    'lap': initLap,
    'show-hide-windows': initShowHideWindows,
};
const settingsReady = new Promise(resolve => {
    let refCnt = 0;
    let to;
    $SD.onDidReceiveGlobalSettings(({payload}) => {
        if (refCnt++) {
            // Updated since start, reload...
            clearTimeout(to);
            to = setTimeout(() => location.reload(), 1000);
        } else {
            resolve(payload.settings);
        }
    });
});


async function _rpc(cmd, ...args) {
    const settings = await settingsReady;
    const hostname = settings.hostname || 'localhost';
    const port = settings.port || 1080;
    const r = await fetch(`http://${hostname}:${port}/api/rpc/v1/${cmd}`, {
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

    send(event, payload) {
        return $SD.send(this.context, event, {
            payload: {
                target: 0,
                ...payload,
            }
        });
    }
    
    setTitle(title) {
        return this.send('setTitle', {title});
    }

    setState(state) {
        return this.send('setState', {state});
    }

    showOk() {
        return this.send('showOk');
    }

    showAlert() {
        return this.send('showAlert');
    }
}


async function initResetStats(button) {
    button.on('keyUp', () =>
        rpc.resetStats()
            .then(() => button.showOk())
            .catch(() => button.showAlert()));
}


async function initLap(button) {
    let timerOfft = 0;
    async function updateLaps() {
        const start = Date.now();
        const stats = await rpc.getAthleteStats('self');
        let lapCount;
        if (stats) {
            const now = Date.now();
            const latency = (now - start) / 2;
            timerOfft = (stats.lap.elapsedTime * 1000) + latency - now;
            lapCount = stats.lapCount;
        } else {
            lapCount = '-';
        }
        button.setTitle(`Lap: ${lapCount}`);
    }
    button.on('keyUp', async () => {
        try {
            await rpc.startLap();
            await updateLaps();
        } catch(e) {
            button.showAlert();
            throw e;
        }
    });
    await updateLaps();
    setInterval(updateLaps, 5000);
}


async function initShowHideWindows(button) {
    let showing = true;
    button.on('keyUp', async () => {
        let error;
        try {
            if (!showing) {
                await rpc.showAllWindows();
            } else {
                await rpc.hideAllWindows();
            }
            showing = !showing;
        } catch(e) {
            error = e;
        }
        button.setState(showing ? 0 : 1);
        if (error) {
            button.showAlert();
            throw error;
        }
    });
}


for (const [key, callback] of Object.entries(actions)) {
    const action = new Action(`${ns}.${key}`);
    action.onWillAppear(async ({context, ...meta}) => {
        const button = new Button(action, key, context, meta);
        try {
            await callback(button);
        } catch(e) {
            console.error('Action error:', e);
            $SD.showAlert(context);
        }
    });
}


$SD.onConnected(ev => {
	console.info('Stream Deck connected', ev);
    $SD.getGlobalSettings();
});
