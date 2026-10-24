#!/usr/bin/env python3
"""Convert the supplied single-file GLB into the Quest renderer's mesh blob.

No third-party Python modules are needed. Input must use triangle primitives
with float32 VEC3 positions, as the pinned Luke ROTJ GLB does.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
import pathlib
import struct
import sys


COMPONENTS = {5121: ("B", 1), 5123: ("H", 2), 5125: ("I", 4), 5126: ("f", 4)}
TYPE_WIDTH = {"SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4, "MAT4": 16}
GRIP_X_M = -0.038
EMITTER_X_M = 0.11922306567430496


def read_glb(path: pathlib.Path):
    data = path.read_bytes()
    if len(data) < 20:
        raise ValueError("GLB is truncated")
    magic, version, declared = struct.unpack_from("<4sII", data)
    if magic != b"glTF" or version != 2 or declared != len(data):
        raise ValueError("Expected a valid GLB 2.0 container")
    offset = 12
    doc = binary = None
    while offset + 8 <= len(data):
        size, kind = struct.unpack_from("<II", data, offset)
        offset += 8
        chunk = data[offset:offset + size]
        if len(chunk) != size:
            raise ValueError("GLB chunk is truncated")
        offset += size
        if kind == 0x4E4F534A:
            doc = json.loads(chunk.decode("utf-8").rstrip(" \t\r\n\0"))
        elif kind == 0x004E4942:
            binary = chunk
    if doc is None or binary is None:
        raise ValueError("GLB must contain JSON and BIN chunks")
    return data, doc, binary


def multiply(a, b):
    return [[sum(a[r][k] * b[k][c] for k in range(4)) for c in range(4)] for r in range(4)]


def node_matrix(node):
    if "matrix" in node:
        flat = node["matrix"]
        return [[flat[c * 4 + r] for c in range(4)] for r in range(4)]
    tx, ty, tz = node.get("translation", [0, 0, 0])
    sx, sy, sz = node.get("scale", [1, 1, 1])
    x, y, z, w = node.get("rotation", [0, 0, 0, 1])
    return [
        [(1 - 2*(y*y+z*z))*sx, (2*(x*y-z*w))*sy, (2*(x*z+y*w))*sz, tx],
        [(2*(x*y+z*w))*sx, (1 - 2*(x*x+z*z))*sy, (2*(y*z-x*w))*sz, ty],
        [(2*(x*z-y*w))*sx, (2*(y*z+x*w))*sy, (1 - 2*(x*x+y*y))*sz, tz],
        [0, 0, 0, 1],
    ]


def accessor(doc, blob, index):
    a = doc["accessors"][index]
    if "sparse" in a:
        raise ValueError("Sparse accessors are not supported by this converter")
    view = doc["bufferViews"][a["bufferView"]]
    fmt, comp_size = COMPONENTS[a["componentType"]]
    width = TYPE_WIDTH[a["type"]]
    count = a["count"]
    start = view.get("byteOffset", 0) + a.get("byteOffset", 0)
    stride = view.get("byteStride", width * comp_size)
    if stride < width * comp_size:
        raise ValueError("Invalid accessor byte stride")
    result = []
    code = "<" + fmt * width
    for i in range(count):
        at = start + i * stride
        if at + width * comp_size > len(blob):
            raise ValueError("Accessor exceeds GLB binary chunk")
        result.append(struct.unpack_from(code, blob, at))
    return a, result


def transform(m, p):
    x, y, z = p
    return (
        m[0][0]*x + m[0][1]*y + m[0][2]*z + m[0][3],
        m[1][0]*x + m[1][1]*y + m[1][2]*z + m[1][3],
        m[2][0]*x + m[2][1]*y + m[2][2]*z + m[2][3],
    )


def convert_position(p):
    # GLB hilt axis is +X. Map its radial Z/Y axes to controller-local X/Y,
    # and make the emitter point down controller-local -Z. Determinant +1
    # preserves triangle winding. Grip origin is the center of the ribbed grip.
    x, y, z = p
    return (z, y, -(x - GRIP_X_M))


def cross(a, b):
    return (a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0])


def normalize(a):
    n = math.sqrt(sum(v*v for v in a))
    return (0.0, 1.0, 0.0) if n < 1e-12 else tuple(v/n for v in a)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("glb", type=pathlib.Path)
    ap.add_argument("output", type=pathlib.Path)
    ap.add_argument("--report", type=pathlib.Path)
    args = ap.parse_args()
    source, doc, blob = read_glb(args.glb)
    materials = doc.get("materials", [])
    if not materials:
        raise ValueError("GLB has no material definitions")
    grouped = [[] for _ in materials]
    scene = doc.get("scenes", [{}])[doc.get("scene", 0)]

    def visit(node_index, parent):
        node = doc["nodes"][node_index]
        world = multiply(parent, node_matrix(node))
        if "mesh" in node:
            mesh = doc["meshes"][node["mesh"]]
            for primitive in mesh.get("primitives", []):
                if primitive.get("mode", 4) != 4:
                    raise ValueError("Only TRIANGLES primitives are supported")
                if "POSITION" not in primitive.get("attributes", {}):
                    continue
                mat = primitive.get("material", 0)
                _, positions = accessor(doc, blob, primitive["attributes"]["POSITION"])
                points = [convert_position(transform(world, p)) for p in positions]
                if "indices" in primitive:
                    idx_accessor, indices = accessor(doc, blob, primitive["indices"])
                    if idx_accessor["type"] != "SCALAR":
                        raise ValueError("Index accessor must be scalar")
                    indices = [v[0] for v in indices]
                else:
                    indices = list(range(len(points)))
                if len(indices) % 3:
                    raise ValueError("Triangle index list is not divisible by three")
                triangles = []
                normal_sum = {}
                for i in range(0, len(indices), 3):
                    tri = [points[int(indices[i+j])] for j in range(3)]
                    n = cross(tuple(tri[1][k]-tri[0][k] for k in range(3)),
                              tuple(tri[2][k]-tri[0][k] for k in range(3)))
                    if sum(v*v for v in n) < 1e-18:
                        continue
                    triangles.append((tri, n))
                    for p in tri:
                        key = tuple(round(v, 7) for v in p)
                        old = normal_sum.get(key, (0.0, 0.0, 0.0))
                        normal_sum[key] = tuple(old[k]+n[k] for k in range(3))
                for tri, _ in triangles:
                    for p in tri:
                        key = tuple(round(v, 7) for v in p)
                        grouped[mat].append((p, normalize(normal_sum[key])))
        for child in node.get("children", []):
            visit(child, world)

    identity = [[1,0,0,0],[0,1,0,0],[0,0,1,0],[0,0,0,1]]
    for root in scene.get("nodes", []):
        visit(root, identity)

    total_vertices = sum(len(g) for g in grouped)
    if not total_vertices:
        raise ValueError("No triangle vertices found")
    ranges = []
    cursor = 0
    for group in grouped:
        ranges.append((cursor, len(group)))
        cursor += len(group)

    args.output.parent.mkdir(parents=True, exist_ok=True)
    with args.output.open("wb") as out:
        out.write(struct.pack("<4sIIII", b"SLM1", 1, total_vertices, len(materials), 0))
        for material in materials:
            pbr = material.get("pbrMetallicRoughness", {})
            color = pbr.get("baseColorFactor", [0.8,0.8,0.8,1.0])
            out.write(struct.pack("<6f", *(color + [pbr.get("metallicFactor",0.0), pbr.get("roughnessFactor",1.0)])))
        for first, count in ranges:
            out.write(struct.pack("<II", first, count))
        for group in grouped:
            for pos, normal in group:
                out.write(struct.pack("<6f", *(pos + normal)))

    all_positions = [p for group in grouped for p, _ in group]
    bounds_min = [min(p[i] for p in all_positions) for i in range(3)]
    bounds_max = [max(p[i] for p in all_positions) for i in range(3)]
    report = {
        "source_sha256": hashlib.sha256(source).hexdigest(),
        "mesh_sha256": hashlib.sha256(args.output.read_bytes()).hexdigest(),
        "source_mesh_count": len(doc.get("meshes", [])),
        "source_material_count": len(materials),
        "material_names": [m.get("name", f"material-{i}") for i, m in enumerate(materials)],
        "output_vertex_count": total_vertices,
        "triangle_count": total_vertices // 3,
        "unit": "meter (source GLB coordinates)",
        "source_long_axis": "+X",
        "grip_origin_source_x_m": GRIP_X_M,
        "emitter_source_x_m": EMITTER_X_M,
        "blade_emitter_controller_local_m": [0.0, 0.0, -(EMITTER_X_M-GRIP_X_M)],
        "bounds_controller_local_m": {"min": bounds_min, "max": bounds_max},
    }
    if args.report:
        args.report.parent.mkdir(parents=True, exist_ok=True)
        args.report.write_text(json.dumps(report, indent=2)+"\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    try:
        main()
    except (ValueError, KeyError, IndexError, struct.error) as exc:
        print(f"convert_luke_glb: {exc}", file=sys.stderr)
        raise SystemExit(2)
