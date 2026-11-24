@group(0) @binding(0) var<storage, read_write> data: array<f32>;

@compute @workgroup_size(256)
fn main(@builtin(global_invocation_id) id: vec3<u32>) {
  let idx = id.x;
  if (idx >= arrayLength(&data)) {
    return;
  }

  var val = data[idx];
  for (var i: u32 = 0u; i < 1000u; i = i + 1u) {
    val = fma(val, 1.000001, 0.000001);
  }
  data[idx] = val;
}