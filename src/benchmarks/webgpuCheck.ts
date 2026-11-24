export interface WebGpuCheckResult {
  supported: boolean;
  error?: string;
  adapterInfo?: {
    vendor: string;
    architecture: string;
    device: string;
    description: string;
  };
  maxBufferSize?: number;
  maxComputeWorkgroupSizeX?: number;
  computeOutput?: number[];
}

export async function testWebGPU(): Promise<WebGpuCheckResult> {
  if (!navigator.gpu) {
    return {
      supported: false,
      error: 'Twoja przeglądarka nie wspiera WebGPU (navigator.gpu jest niedostępne).',
    };
  }

  const adapter = await navigator.gpu.requestAdapter({
    powerPreference: 'high-performance',
  });

  if (!adapter) {
    return {
      supported: false,
      error: 'Nie udało się uzyskać dostępu do adaptera GPU.',
    };
  }

  const device = await adapter.requestDevice();

  const shaderCode = `
    @group(0) @binding(0) var<storage, read_write> data: array<f32>;

    @compute @workgroup_size(4)
    fn main(@builtin(global_invocation_id) id: vec3<u32>) {
      data[id.x] = data[id.x] * 2.0;
    }
  `;

  const input = new Float32Array([1, 2, 3, 4]);

  const gpuBuffer = device.createBuffer({
    size: input.byteLength,
    usage:
      GPUBufferUsage.STORAGE |
      GPUBufferUsage.COPY_SRC |
      GPUBufferUsage.COPY_DST,
  });

  device.queue.writeBuffer(gpuBuffer, 0, input);

  const readBuffer = device.createBuffer({
    size: input.byteLength,
    usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
  });

  const shaderModule = device.createShaderModule({ code: shaderCode });

  const pipeline = device.createComputePipeline({
    layout: 'auto',
    compute: {
      module: shaderModule,
      entryPoint: 'main',
    },
  });

  const bindGroup = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [{ binding: 0, resource: { buffer: gpuBuffer } }],
  });

  const commandEncoder = device.createCommandEncoder();
  const passEncoder = commandEncoder.beginComputePass();
  passEncoder.setPipeline(pipeline);
  passEncoder.setBindGroup(0, bindGroup);
  passEncoder.dispatchWorkgroups(1);
  passEncoder.end();

  commandEncoder.copyBufferToBuffer(gpuBuffer, 0, readBuffer, 0, input.byteLength);
  device.queue.submit([commandEncoder.finish()]);

  await readBuffer.mapAsync(GPUMapMode.READ);
  const copyArrayBuffer = readBuffer.getMappedRange();
  const output = Array.from(new Float32Array(copyArrayBuffer.slice(0)));
  readBuffer.unmap();

  gpuBuffer.destroy();
  readBuffer.destroy();

  return {
    supported: true,
    adapterInfo: {
      vendor: adapter.info.vendor || 'nieznany',
      architecture: adapter.info.architecture || 'nieznana',
      device: adapter.info.device || 'nieznane',
      description: adapter.info.description || 'brak opisu',
    },
    maxBufferSize: adapter.limits.maxBufferSize,
    maxComputeWorkgroupSizeX: adapter.limits.maxComputeWorkgroupSizeX,
    computeOutput: output,
  };
}