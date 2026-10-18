(function exposeTextureCatalog(global) {
    const sources = Object.freeze({ shipTexture: 'boat_wood_wet_v2', compassTexture: 'compass_brass_v2',
        pillarsTexture: 'germany010', cthulhuTexture: 'Cthulhu_2k_Base_Color',
        cthulhuAOTex: 'Cthulhu_2k_AO', cthulhuMetallicTex: 'Cthulhu_2k_Metallic',
        cthulhuRoughnessTex: 'Cthulhu_2k_Roughness', waterTexture: 'beautiful-photo-sea-waves' });
    global.TextureCatalog = {
        entries(quality) {
            const variant = quality === 'low' ? 'low' : 'high';
            return Object.fromEntries(Object.entries(sources).map(([key, stem]) => [key, `assets/textures/optimized/${variant}/${stem}.webp`]));
        },
        url(quality, name) { return `assets/textures/optimized/${quality === 'low' ? 'low' : 'high'}/${name.replace(/\.(png|jpg)$/, '')}.webp`; }
    };
}(window));
