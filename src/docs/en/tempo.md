# Read, write and timing

So far, each phase seemed to happen instantly. In practice, the memory takes some time to respond, and the CPU works at the pace of its **clock**. This page shows why **the memory cycle is not the CPU cycle**.

## Phases of a transaction {#fases}

The **Read** and **Write** buttons run a complete transaction, one phase per click on **Next phase**. The order of the phases is in [How the memory works](#/documentacao/memoria#ordem). Changing the MAR, the MDR or the control signals by hand in the middle of a transaction stops it. Editing the memory contents does not.

## Memory timings {#tempos}

The timings used here are **teaching values**: they do not come from any real chip.

| Timing   | From                                 | To                                        |
| -------- | ------------------------------------ | ----------------------------------------- |
| **t_AA** | the address becomes stable on the AB | the data becomes valid                    |
| **t_OE** | RD turns on                          | the data becomes valid on the DB          |
| **t_WP** | (minimum length)                     | the WR pulse must last at least this long |

The simulator offers three memories:

| Memory | t_AA   | t_OE  | t_WP  |
| ------ | ------ | ----- | ----- |
| fast   | 15 ns  | 8 ns  | 12 ns |
| medium | 45 ns  | 20 ns | 35 ns |
| slow   | 120 ns | 50 ns | 90 ns |

And four CPU clocks: 10, 25, 50 and 100 MHz (periods of 100, 40, 20 and 10 ns).

## Clock states {#estados}

The CPU splits a read into **states**, each one clock period long:

- **T1**: the MAR puts the address on the AB; in the middle of T1, the CPU turns CS on;
- **T2**: RD turns on at the start of T2; **at the end of T2, the CPU latches the DB into the MDR**;
- **T3**: in the middle of T3, RD and CS turn off, and the DB floats again.

The data is only valid at `max(t_AA, start of T2 + t_OE)`. With a 50 MHz clock and the medium memory, that is `max(45, 20 + 20) = 45 ns`, but the CPU wants to latch at 40 ns (end of T2). There is not enough time.

## Wait states {#wait-states}

When the memory is not done yet, it holds the **READY** signal at 0. At the end of T2, the CPU sees READY at 0 and **waits a whole cycle**, doing nothing: a **wait state** (Tw). It repeats this until READY goes up.

In the example above, one wait state is enough: the latch moves to 60 ns, after the data at 45 ns. In the timing diagram, the **Tw** band is highlighted, and the read cycle goes from 3 to 4 states.

Notice: the **faster** the CPU, the **more** wait states. With the slow memory, a 100 MHz CPU waits 10 cycles on every read. A slow memory makes the CPU waste cycles; that is why caches and synchronous memories exist.

## Writing {#escrita}

In a write, WR turns on at the start of T2 and off at the start of T3: a pulse one clock period long. If that is less than **t_WP**, the memory holds READY at 0 and the CPU keeps WR on for more cycles.

## Without wait states {#sem-espera}

Uncheck **“The CPU waits for the memory”** and pick a slow memory:

- in a **read**, the CPU latches at the end of T2 anyway, with the data still invalid: the **MDR gets X**;
- in a **write**, the WR pulse is too short, and the **cell becomes undefined (X)**.

The summary above the diagram shows the read going wrong, and the **MDR latches** mark turns red, before the **data valid** mark.

## The timing diagram {#diagrama}

The diagram shows, on the same axis in nanoseconds:

- the **CLK** and the state bands (T1, T2, Tw, T3);
- **AB**, **CS**, **RD** or **WR**, **READY** (when the CPU waits) and **DB**;
- the **MDR** in a read, or the **cell** in a write.

On the buses, a hexagon with a value is valid data; red stripes are X; dashed is Z. With no transaction, the diagram shows a preview of a read of the MAR address. During a transaction, a blue cursor follows the current phase.

[//]: # 'SPDX-License-Identifier: GPL-3.0-or-later'
