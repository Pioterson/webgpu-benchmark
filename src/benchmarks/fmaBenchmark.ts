import fmaShaderCode from '../shaders/fmaBenchmark.wgsl?raw';

export interface FmaBenchmarkResult {
  avgTimeMs: number;
  totalTimeMs: number;
  gflops: number;
  elements: number;
  runs: number;
}

export async function runFmaBenchmark(): Promise<FmaBenchmarkResult> {
  if (!navigator.gpu) {
    throw new Error('WebGPU nie jest wspierane w tej przeglądarce.');
  }

  const adapter = await navigator.gpu.requestAdapter({
    powerPreference: 'high-performance',
  });

  if (!adapter) {
    throw new Error('Nie znaleziono adaptera GPU.');
  }

  const device = await adapter.requestDevice();

  const elements = 2_097_152;
  const workgroupSize = 256;
  const workgroupCount = Math.ceil(elements / workgroupSize);
  const iterationsPerThread = 1000;
  const runs = 10;

  const input = new Float32Array(elements);
  for (let i = 0; i < elements; i++) {
    input[i] = (i % 100) * 0.01;
  }

  const gpuBuffer = device.createBuffer({
    size: input.byteLength,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  });

  device.queue.writeBuffer(gpuBuffer, 0, input);

  const shaderModule = device.createShaderModule({ code: fmaShaderCode });

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

  const dispatchOnce = () => {
    const commandEncoder = device.createCommandEncoder();
    const passEncoder = commandEncoder.beginComputePass();
    passEncoder.setPipeline(pipeline);
    passEncoder.setBindGroup(0, bindGroup);
    passEncoder.dispatchWorkgroups(workgroupCount);
    passEncoder.end();
    device.queue.submit([commandEncoder.finish()]);
  };

  dispatchOnce();
  await device.queue.onSubmittedWorkDone();

  const start = performance.now();
  for (let r = 0; r < runs; r++) {
    dispatchOnce();
    await device.queue.onSubmittedWorkDone();
  }
  const end = performance.now();

  gpuBuffer.destroy();

  const totalTimeMs = end - start;
  const avgTimeMs = totalTimeMs / runs;
  const flopsPerRun = elements * iterationsPerThread * 2;
  const gflops = flopsPerRun / (avgTimeMs / 1000) / 1e9;

  return {
    avgTimeMs,
    totalTimeMs,
    gflops,
    elements,
    runs,
  };
}