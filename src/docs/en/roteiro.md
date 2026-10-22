# Lesson plan

Exercises to do in the simulator, from the simplest to the most involved. The answers are at the end of the page.

## 1. Addresses and the array {#ex-matriz}

1. Which row and column hold address `C4`? And `0F`?
2. Put `00` in the MAR and turn on one bit at a time, from A0 to A7. What changes in the grid with each bit?
3. How many addresses are in the same row as `3A`? Which ones?

## 2. Control signals {#ex-sinais}

1. Put `3A` in the MAR and turn on only **RD**. Does the data appear on the DB? Why?
2. Now turn **CS** on. What changed in the grid and on the DB?
3. With CS and RD on, turn on **MDR → DB** with MDR = `00`. Which DB bits become X?

## 3. Writing {#ex-escrita}

1. Write `AA` to address `10` using **Write**. In which phase does the cell change?
2. Now by hand: put `20` in the MAR, turn on **CS** and then **WR**, without turning on **MDR → DB**. What happens to cell `20`? Why?

## 4. Timing and wait states {#ex-tempo}

1. With a 50 MHz clock and the medium memory, how many wait states does a read have? How long is the cycle?
2. Switch the clock to 10 MHz. And now?
3. With the slow memory and a 100 MHz clock, how many wait states are there? What does that say about using a fast CPU with a slow memory?
4. Uncheck **"The CPU waits for the memory"**, keep the slow memory and read an address. What does the MDR get?

## 5. In logic gates {#ex-portas}

1. In the row decoder, which inputs does the gate for output `5` get?
2. Put `3A` in the MAR and turn CS on. In **Bit of address**, choose D0: is the bit line 0 or 1? Check against the value of `M[3A]`.

## Answers {#respostas}

**1.** (1) `C4`: row C, column 4; `0F`: row 0, column F. (2) A0 to A3 move the column (by 1, 2, 4 and 8 columns); A4 to A7 move the row. (3) 16 addresses: `30` to `3F`.

**2.** (1) No: without CS, the decoders and the buffers are off, and the DB stays in Z. (2) Row 3 and column A light up, and the data appears on the DB. (3) The bits where the memory data is 1, because the CPU pulls to 0 and the memory to 1.

**3.** (1) In the **WR on** phase. (2) The cell becomes undefined (X): it copied a floating DB.

**4.** (1) One wait state; the cycle takes 4 states, 80 ns. (2) None: with 100 ns per cycle, the data is valid (at `max(45, 100 + 20) = 120` ns) before the latch (200 ns). (3) 10 wait states: the CPU spends most of its time waiting for the memory. (4) X: the CPU latched before the data was valid.

**5.** (1) `5` is `0101`: A4 direct, A5 inverted, A6 direct, A7 inverted, and EN (the row decoder inputs are A4 to A7). (2) It depends on the contents: it is bit 0 of `M[3A]`, shown in the grid.

[//]: # 'SPDX-License-Identifier: GPL-3.0-or-later'
