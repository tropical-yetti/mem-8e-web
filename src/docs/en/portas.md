# In logic gates

The **In logic gates** panel shows three parts of the memory as AND, OR and NOT gates. The drawings are the same gates the simulator computes: the wires change along with the rest of the screen.

## 4 → 16 decoder {#decodificador}

The decoder has 4 inputs, an enable input (**EN**, connected to CS) and 16 outputs.

1. Each input goes through a **NOT** gate. So, for each bit there are two wires: the direct one and the inverted one.
2. Each output is a 5-input **AND** gate: EN and, for each bit, the direct wire (if that bit of the output number is 1) or the inverted one (if it is 0).

Output 3 (`0011`) gets A0 direct, A1 direct, A2 inverted, A3 inverted and EN. Only with input `0011` and EN at 1 are all these inputs at 1.

| Output     | Gets                       |
| ---------- | -------------------------- |
| 0 (`0000`) | ¬A3 · ¬A2 · ¬A1 · ¬A0 · EN |
| 3 (`0011`) | ¬A3 · ¬A2 · A1 · A0 · EN   |
| A (`1010`) | A3 · ¬A2 · A1 · ¬A0 · EN   |
| F (`1111`) | A3 · A2 · A1 · A0 · EN     |

With an undefined input bit (X), two outputs become X: the two the address could select. The others stay at 0.

## One memory bit {#celula}

The **Bit of address** tab follows one bit (D0 to D7) of the MAR location.

**Write.** A 4-input AND (CS, WR, row and column) enables the **D latch**. While it is 1, the latch copies the DB bit. When it goes back to 0, the latch keeps the value.

**Read.** The bit goes through three stages:

1. **word line · Q**: an AND puts the bit on the column's bit line. An OR joins it with the other 15 rows (only the active row contributes);
2. **column · bit line**: another AND, and an OR with the other 15 columns: that is the column selector;
3. **tri-state buffer**: it only puts the result on the DB with **CS · RD** at 1. Otherwise, the output is Z.

## Why a latch? {#latch}

The D latch is **transparent**: while writing is enabled, the cell follows the DB. That is why the data must be stable on the DB during the whole WR pulse, and why the pulse must be long enough (the t_WP in the [timing page](#/documentacao/tempo#tempos)).

[//]: # 'SPDX-License-Identifier: GPL-3.0-or-later'
