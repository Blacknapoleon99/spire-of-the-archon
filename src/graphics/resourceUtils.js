/**
 * Small Three.js disposal helpers for resources owned by a single runtime
 * entity. GLTF geometry/materials are deliberately not disposed here because
 * CharacterAnimator instances clone from AssetLoader's shared cache. The
 * cache owner releases those resources when a floor is evicted.
 */
export function disposeObjectGeometries(root) {
  root?.traverse?.(child => {
    child.geometry?.dispose?.();
  });
}

export function disposeSprite(sprite) {
  if (!sprite) return;
  const material = sprite.material;
  const materials = Array.isArray(material) ? material : [material];
  for (const item of materials) {
    item?.map?.dispose?.();
    item?.dispose?.();
  }
}
