function _convert_base(d, e, f) {
    const g = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ+/';
    const h = g.slice(0, e);
    const i = g.slice(0, f);
    let j = 0;
    for (let c = 0; c < d.length; c++) {
        const b = d.charAt(c);
        const index = h.indexOf(b);
        if (index !== -1) {
            j += index * Math.pow(e, c);
        }
    }
    let k = '';
    while (j) {
        k = i.charAt(j % f) + k;
        j = Math.floor(j / f);
    }
    return k || '0';
}

function deobfuscator(h, n, t, e) {
    let r = '';
    let i = 0;
    const lh = h.length;
    while (i < lh) {
        let s = '';
        while (i < lh && h[i] !== n[e]) {
            s += h[i];
            i++;
        }
        s = Array.from(s, c => n.indexOf(c)).join('');
        r += String.fromCharCode(parseInt(_convert_base(s, e, 10), 10) - t);
        i++;
    }
    return r;
}
