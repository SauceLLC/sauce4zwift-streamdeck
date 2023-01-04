$PI.onDidReceiveGlobalSettings(({payload}) => {
    const form = document.querySelector('#property-inspector');
    Utils.setFormValue(payload.settings, form);
    form.addEventListener('input', Utils.debounce(150, () =>
        $PI.setGlobalSettings(Utils.getFormValue(form))));
});

$PI.onConnected(() => void $PI.getGlobalSettings());
