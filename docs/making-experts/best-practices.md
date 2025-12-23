---
title: "Best Practices"
---

# Best Practices

These principles help you avoid common pitfalls in agent development: monoliths, complexity explosions, debugging nightmares, and fragile systems. Building a large agent head-on almost always fails.

> [!NOTE]
> The key insight: we tend to over-control, but LLMs work best when you trust their reasoning and define goals rather than procedures.

## The Five Principles

1. **Do One Thing Well**
2. **Trust the LLM, Define Domain Knowledge**
3. **Let Them Collaborate**
4. **Keep It Verifiable**
5. **Ship Early**

---

## Do One Thing Well

**Pitfall**: Experts that do everything eventually break under their own weight.

**Bad** — An Expert that handles too many responsibilities:
```toml
[experts."assistant"]
description = "Handles customer inquiries, writes reports, schedules meetings, and manages expenses"
```

**Good** — Focused Experts with clear boundaries:
```toml
[experts."customer-support"]
description = "Answers customer questions about products and orders"

[experts."report-writer"]
description = "Creates weekly summary reports from data"

[experts."scheduler"]
description = "Finds available time slots and books meetings"
```

When something goes wrong in a monolith, you can't tell which part failed. Focused Experts are easier to debug, test, and improve independently.

---

## Trust the LLM, Define Domain Knowledge

**Pitfall**: Step-by-step instructions that become unmaintainable.

**Bad** — Every requirement change means rewriting the entire procedure:
```toml
instruction = """
1. First, greet the customer
2. Ask for their order number
3. Look up the order
4. If shipped, give tracking number
5. If not shipped, apologize and give estimated date
"""
```

**Good** — Domain knowledge lets the LLM adapt:
```toml
instruction = """
You are a customer support specialist for an online store.

Key policies:
- Orders ship within 2 business days
- Free returns within 30 days
- VIP customers (order history > $1000) get priority handling

Tone: Friendly but professional. Apologize for delays, offer solutions.
"""
```

The LLM knows *how* to have a conversation. What it doesn't know is your company's policies — that's domain knowledge.

---

## Let Them Collaborate

**Pitfall**: Monolithic agents that can't be reused, tested, or improved independently.

**Bad** — A monolith that only the original author can maintain:
```toml
[experts."event-planner"]
instruction = """
Plan the company event: survey preferences, find venue, arrange catering, send invitations.
"""
```

**Good** — Modular Experts that anyone can reuse and improve:
```toml
[experts."event-coordinator"]
delegates = ["venue-finder", "caterer", "invitation-sender"]

[experts."venue-finder"]
description = "Finds and books venues for given date and capacity"
```

Modular Experts unlock collaboration — between Experts, and between people. The same `venue-finder` works for any event. One person improves `caterer` while another builds `invitation-sender`. Test each Expert independently. Replace one without touching others.

---

## Keep It Verifiable

**Pitfall**: Instructions that only the author can understand.

If others can't verify what an Expert does, it's neither safe nor reusable.

**Bad** — A third party can't verify what this Expert actually does:
```toml
instruction = """
Handle expense reports appropriately.
Use your judgment for edge cases.
"""
```

**Good** — Anyone reading this knows exactly what to expect:
```toml
instruction = """
You are an expense report reviewer.

Approval rules:
- Under $100: Auto-approve with receipt
- $100-$500: Approve if business purpose is clear
- Over $500: Flag for manager review
"""
```

If someone else can't read your Expert and predict its behavior, it's not verifiable.

---

## Ship Early

**Pitfall**: Over-engineering for hypothetical scenarios.

**Bad** — Trying to handle every case before launch:
```toml
instruction = """
You are a travel assistant. Handle:
- Flight bookings (compare airlines, handle cancellations, rebooking)
- Hotel reservations (check availability, loyalty programs, special requests)
- Ground transportation (rental cars, trains, rideshare)
- Travel insurance (compare policies, process claims)
- Visa requirements (check by nationality, application assistance)
Support multiple languages and currencies.
"""
```

**Good** — Start minimal, expand based on real usage:
```toml
instruction = """
You are a flight booking assistant.
Help users find flights between cities.
For hotels or other travel needs, suggest they contact the full-service desk.
"""
```

Real users reveal the actual edge cases. A complex initial design often solves the wrong problems. Ship, observe, iterate.
