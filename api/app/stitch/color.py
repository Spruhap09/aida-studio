"""sRGB → CIELAB and CIEDE2000. Used to match pixels to DMC floss the way eyes see color."""

from __future__ import annotations

import numpy as np

# D65 reference white
_XN, _YN, _ZN = 0.95047, 1.00000, 1.08883


def srgb_to_linear(rgb: np.ndarray) -> np.ndarray:
    rgb = rgb / 255.0
    return np.where(rgb <= 0.04045, rgb / 12.92, ((rgb + 0.055) / 1.055) ** 2.4)


def rgb_to_xyz(rgb: np.ndarray) -> np.ndarray:
    linear = srgb_to_linear(rgb)
    m = np.array(
        [
            [0.4124564, 0.3575761, 0.1804375],
            [0.2126729, 0.7151522, 0.0721750],
            [0.0193339, 0.1191920, 0.9503041],
        ]
    )
    return linear @ m.T


def xyz_to_lab(xyz: np.ndarray) -> np.ndarray:
    x = xyz[..., 0] / _XN
    y = xyz[..., 1] / _YN
    z = xyz[..., 2] / _ZN
    eps = 216 / 24389
    kappa = 24389 / 27

    def f(t: np.ndarray) -> np.ndarray:
        return np.where(t > eps, np.cbrt(t), (kappa * t + 16) / 116)

    fx, fy, fz = f(x), f(y), f(z)
    L = 116 * fy - 16
    a = 500 * (fx - fy)
    b = 200 * (fy - fz)
    return np.stack([L, a, b], axis=-1)


def rgb_to_lab(rgb: np.ndarray) -> np.ndarray:
    return xyz_to_lab(rgb_to_xyz(rgb))


def hex_to_rgb(value: str) -> tuple[int, int, int]:
    h = value.lstrip("#")
    return int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)


def rgb_to_hex(rgb: tuple[int, int, int] | np.ndarray) -> str:
    r, g, b = (int(x) for x in rgb)
    return f"#{r:02x}{g:02x}{b:02x}"


def ciede2000(lab1: np.ndarray, lab2: np.ndarray) -> np.ndarray:
    """Vectorized CIEDE2000. lab1 (n,3), lab2 (m,3) → (n,m) or pairwise if same shape with m=1."""
    lab1 = np.atleast_2d(lab1).astype(np.float64)
    lab2 = np.atleast_2d(lab2).astype(np.float64)
    L1, a1, b1 = lab1[:, 0:1], lab1[:, 1:2], lab1[:, 2:3]
    L2, a2, b2 = lab2[:, 0], lab2[:, 1], lab2[:, 2]

    C1 = np.sqrt(a1**2 + b1**2)
    C2 = np.sqrt(a2**2 + b2**2)
    Cbar = (C1 + C2) / 2
    Cbar7 = Cbar**7
    G = 0.5 * (1 - np.sqrt(Cbar7 / (Cbar7 + 25**7)))
    a1p = (1 + G) * a1
    a2p = (1 + G) * a2
    C1p = np.sqrt(a1p**2 + b1**2)
    C2p = np.sqrt(a2p**2 + b2**2)

    h1p = np.degrees(np.arctan2(b1, a1p)) % 360
    h2p = np.degrees(np.arctan2(b2, a2p)) % 360

    dLp = L2 - L1
    dCp = C2p - C1p

    dhp = h2p - h1p
    dhp = np.where((C1p * C2p) == 0, 0, dhp)
    dhp = np.where(dhp > 180, dhp - 360, dhp)
    dhp = np.where(dhp < -180, dhp + 360, dhp)
    dHp = 2 * np.sqrt(C1p * C2p) * np.sin(np.radians(dhp) / 2)

    Lp = (L1 + L2) / 2
    Cp = (C1p + C2p) / 2

    hp = (h1p + h2p) / 2
    hp = np.where(np.abs(h1p - h2p) > 180, hp + 180, hp)
    hp = np.where((C1p * C2p) == 0, h1p + h2p, hp)
    hp = hp % 360

    T = (
        1
        - 0.17 * np.cos(np.radians(hp - 30))
        + 0.24 * np.cos(np.radians(2 * hp))
        + 0.32 * np.cos(np.radians(3 * hp + 6))
        - 0.20 * np.cos(np.radians(4 * hp - 63))
    )
    dtheta = 30 * np.exp(-(((hp - 275) / 25) ** 2))
    Rc = 2 * np.sqrt(Cp**7 / (Cp**7 + 25**7))
    Sl = 1 + (0.015 * (Lp - 50) ** 2) / np.sqrt(20 + (Lp - 50) ** 2)
    Sc = 1 + 0.045 * Cp
    Sh = 1 + 0.015 * Cp * T
    Rt = -np.sin(np.radians(2 * dtheta)) * Rc

    kL = kC = kH = 1
    return np.sqrt(
        (dLp / (kL * Sl)) ** 2
        + (dCp / (kC * Sc)) ** 2
        + (dHp / (kH * Sh)) ** 2
        + Rt * (dCp / (kC * Sc)) * (dHp / (kH * Sh))
    )
