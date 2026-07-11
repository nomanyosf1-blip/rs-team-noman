import "dotenv/config";
import express from "express";
import session from "express-session";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import { 
  Client, 
  GatewayIntentBits, 
  ChannelType, 
  PermissionsBitField, 
  PermissionFlagsBits,
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  ModalBuilder, 
  TextInputBuilder, 
  TextInputStyle,
  InteractionType,
  StringSelectMenuBuilder,
  TextChannel,
  GuildMember,
  ColorResolvable,
  REST,
  Routes,
  SlashCommandBuilder
} from 'discord.js';

async function startServer() {
  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  });

  const app = express();
  const CONFIG_PATH = path.join(process.cwd(), "config.json");

  let botConfig: any = {
    server: { port: 3000, host: "0.0.0.0" },
    app: { 
      name: "RS TEAM", 
      version: "unknown",
      branding: {
        primaryColor: "#c5a059",
        logo: "",
        banner: "",
        footer: ""
      }
    },
    accessControl: {
      adminRoleId: "",
      staffRoleId: "",
      subscriberRoleId: "",
      minRoleToAccess: "subscriber"
    },
    botSettings: {
      intents: ["Guilds", "GuildMessages", "MessageContent"],
      defaultActivity: "",
      defaultStatus: "online"
    },
    globalSystemEmbeds: {
      alreadyHasTicket: { title: "", description: "", color: "" },
      ticketWarning: { title: "", description: "", color: "" }
    },
    globalDiscord: {
      guildId: "",
      adminRoleId: "",
      staffRoleId: "",
      logChannelId: "",
      ticketCategoryId: "",
      transcriptChannelId: ""
    },
    instances: []
  };

  function loadConfig() {
    try {
      if (fs.existsSync(CONFIG_PATH)) {
        const data = fs.readFileSync(CONFIG_PATH, "utf-8");
        const parsed = JSON.parse(data);
        
        // Migrate old format if needed
        if (parsed.instances && !parsed.server) {
           botConfig.instances = parsed.instances;
        } else {
           botConfig = { ...botConfig, ...parsed };
        }
      }
    } catch (err) {
      console.error("[CONFIG_ERROR] Failed to load config.json:", err);
    }
  }

  function saveConfig() {
    try {
      fs.writeFileSync(CONFIG_PATH, JSON.stringify(botConfig, null, 2), "utf-8");
    } catch (err) {
      console.error("[CONFIG_ERROR] Failed to save config.json:", err);
    }
  }

  loadConfig();
  
  const PORT = process.env.PORT || botConfig.server?.port || 3000;

  app.use(express.json());
  app.set('trust proxy', 1);

  app.use(session({
    secret: process.env.SESSION_SECRET || 'rs-team-session-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false,
      maxAge: 24 * 60 * 60 * 1000
    }
  }));
  
  const apiRouter = express.Router();
  app.use("/api", apiRouter);

  apiRouter.get("/ping", (req, res) => {
    res.json({ 
      message: "pong", 
      time: new Date().toISOString(), 
      version: botConfig.app?.version || "3.5" 
    });
  });

  const botClients = new Map<string, Client>();

  function isSnowflake(id: string | null | undefined): boolean {
    return !!(id && /^\d{17,21}$/.test(id));
  }

  async function startBotInstance(instanceId: string) {
    const instance = botConfig.instances.find(i => i.id === instanceId);
    if (!instance) return;

    const tokenToUse = (instance.token && instance.token.trim() !== "" && instance.token !== "YOUR_DISCORD_BOT_TOKEN_HERE") ? instance.token : (process.env.DISCORD_TOKEN || "");
    if (!tokenToUse) return;

    try {
      if (botClients.has(instanceId)) {
        await botClients.get(instanceId)?.destroy().catch(() => null);
        botClients.delete(instanceId);
      }

      const intentNames = botConfig.botSettings?.intents || [
        'Guilds', 
        'GuildMessages', 
        'MessageContent'
      ];
      if (!intentNames.includes('DirectMessages')) {
        intentNames.push('DirectMessages');
      }
      const intents = intentNames.map((intent: string) => (GatewayIntentBits as any)[intent]);

      const client = new Client({
        intents: intents
      });

      client.on('ready', async () => {
        console.log(`[BOT_${instance.id}] Logged in as ${client.user?.tag}!`);
        instance.status = "متصل";
        
        // Store bot avatar and username
        instance.avatar = client.user?.displayAvatarURL({ size: 128 }) || null;
        if (client.user?.username && (!instance.name || instance.name === "بوت جديد")) {
          instance.name = client.user.username;
        }
        
        if (botConfig.botSettings?.defaultActivity) {
          client.user?.setActivity(botConfig.botSettings.defaultActivity);
        }

        const commands = [
          new SlashCommandBuilder()
            .setName('dashboard')
            .setDescription('رابط لوحة التحكم')
            .setDMPermission(true),
          new SlashCommandBuilder()
            .setName('change_token')
            .setDescription('تغيير توكن البوت')
            .setDMPermission(true),
          new SlashCommandBuilder()
            .setName('bot_status')
            .setDescription('حالة البوت')
            .setDMPermission(true),
          new SlashCommandBuilder()
            .setName('stop')
            .setDescription('إيقاف البوت')
            .setDMPermission(true),
          new SlashCommandBuilder()
            .setName('help')
            .setDescription('قائمة الأوامر')
            .setDMPermission(true)
        ];

        try {
          const rest = new REST({ version: '10' }).setToken(tokenToUse);
          await rest.put(Routes.applicationCommands(client.user!.id), { body: commands });
          console.log(`[BOT_${instance.id}] Slash commands registered.`);
        } catch (err) {
          console.error(`[BOT_${instance.id}] Failed to register commands:`, err);
        }
        
        saveConfig();
      });

      client.on('interactionCreate', async (interaction) => {
        handleInteraction(interaction, instance.id);
      });

      client.on('messageCreate', async (message) => {
        if (message.author.bot) return;
        const prefix = '!';
        if (!message.content.startsWith(prefix)) return;

        if (instance.ownerId && isSnowflake(instance.ownerId) && message.author.id !== instance.ownerId) return;

        const args = message.content.slice(prefix.length).trim().split(/\s+/);
        const cmd = args[0]?.toLowerCase();
        const dashboardUrl = process.env.APP_URL || 'https://rs-team-noman-production.up.railway.app';

        if (cmd === 'help') {
          const embed = new EmbedBuilder()
            .setTitle('📖 قائمة الأوامر')
            .setDescription('**!dashboard** - رابط لوحة التحكم\n**!change_token** - تغيير توكن البوت\n**!bot_status** - حالة البوت\n**!stop** - إيقاف البوت\n**!help** - هذه القائمة')
            .setColor((botConfig.app?.branding?.primaryColor || '#c5a059') as ColorResolvable)
            .setFooter({ text: botConfig.app?.branding?.footer || 'RS TEAM System' });
          await message.delete().catch(() => null);
          return message.channel.send({ embeds: [embed] }).catch(() => null);
        }

        if (cmd === 'dashboard') {
          const embed = new EmbedBuilder()
            .setTitle('🔗 لوحة التحكم')
            .setDescription(`[افتح لوحة التحكم](${dashboardUrl}/dashboard)`)
            .setColor((botConfig.app?.branding?.primaryColor || '#c5a059') as ColorResolvable)
            .setFooter({ text: botConfig.app?.branding?.footer || 'RS TEAM System' });
          await message.delete().catch(() => null);
          return message.channel.send({ embeds: [embed] }).catch(() => null);
        }

        if (cmd === 'bot_status') {
          const isRunning = botClients.has(instance.id) && botClients.get(instance.id)?.isReady();
          const embed = new EmbedBuilder()
            .setTitle('📊 حالة البوت')
            .setDescription(`**الاسم:** ${instance.name}\n**الحالة:** ${isRunning ? '🟢 متصل' : '🔴 متوقف'}\n**المالك:** <@${instance.ownerId || 'غير معروف'}>`)
            .setColor(isRunning ? '#10B981' : '#EF4444')
            .setFooter({ text: botConfig.app?.branding?.footer || 'RS TEAM System' });
          await message.delete().catch(() => null);
          return message.channel.send({ embeds: [embed] }).catch(() => null);
        }

        if (cmd === 'change_token') {
          const newToken = args[1];
          if (!newToken) {
            await message.delete().catch(() => null);
            return message.channel.send({ content: '❌ استخدم: `!change_token التوكن_الجديد`' }).catch(() => null);
          }
          instance.token = newToken;
          saveConfig();
          if (botClients.has(instance.id)) {
            await botClients.get(instance.id)?.destroy().catch(() => null);
            botClients.delete(instance.id);
          }
          await startBotInstance(instance.id);
          const embed = new EmbedBuilder()
            .setTitle('✅ تم تغيير التوكن')
            .setDescription('تم تحديث توكن البوت وإعادة تشغيله بنجاح!')
            .setColor('#10B981');
          await message.delete().catch(() => null);
          return message.channel.send({ embeds: [embed] }).catch(() => null);
        }

        if (cmd === 'stop') {
          const client = botClients.get(instance.id);
          if (client) {
            await client.destroy().catch(() => null);
            botClients.delete(instance.id);
            instance.status = "متوقف";
            saveConfig();
          }
          await message.delete().catch(() => null);
          return message.channel.send({ embeds: [new EmbedBuilder().setTitle('⏹️ تم إيقاف البوت').setDescription('تم إيقاف بوتك بنجاح.').setColor('#EF4444')] }).catch(() => null);
        }
      });

      botClients.set(instanceId, client);
      await client.login(tokenToUse);
    } catch (err: any) {
      console.error(`[BOT_ERROR_${instanceId}] Login failed:`, err.message);
      instance.status = "خطأ في التوكن";
      saveConfig();
    }
  }

  // --- Ticket Creation Helper ---
  async function createTicket(interaction: any, sector: any, answers: any[], instance: any) {
    const openChannel = interaction.guild.channels.cache.find((c: any) => 
      c.name === `ticket-${interaction.user.username.toLowerCase()}` || 
      (c.name.startsWith(`ticket-`) && c.topic === interaction.user.id)
    );

    if (openChannel) {
      const embedConfig = instance?.systemEmbeds?.alreadyHasTicket || botConfig.globalSystemEmbeds?.alreadyHasTicket || {
        title: "❌ لديك تذكرة مفتوحة",
        description: "أغلق تذكرتك الحالية أولاً لفتح تذكرة جديدة.",
        color: "#FF0000"
      };
      const errEmbed = new EmbedBuilder()
        .setTitle(embedConfig.title || "❌ لديك تذكرة مفتوحة")
        .setDescription((embedConfig.description || "أغلق تذكرتك الحالية أولاً لفتح تذكرة جديدة.").replace("{channel}", `<#${openChannel.id}>`))
        .setColor((embedConfig.color || "#FF0000") as ColorResolvable);
      
      if (interaction.deferred || interaction.replied) {
        return interaction.editReply({ embeds: [errEmbed] }).catch(() => null);
      } else {
        return interaction.reply({ embeds: [errEmbed], ephemeral: true }).catch(() => null);
      }
    }

    const categoryId = isSnowflake(sector.categoryId) ? sector.categoryId : (isSnowflake(botConfig.globalDiscord?.ticketCategoryId) ? botConfig.globalDiscord?.ticketCategoryId : undefined);
    const staffRoleId = isSnowflake(sector.staffRoleId) ? sector.staffRoleId : (isSnowflake(botConfig.globalDiscord?.staffRoleId) ? botConfig.globalDiscord?.staffRoleId : undefined);
    const adminRoleId = isSnowflake(botConfig.globalDiscord?.adminRoleId) ? botConfig.globalDiscord?.adminRoleId : undefined;

    const permissionOverwrites = [
      {
        id: interaction.guild.id,
        deny: [PermissionsBitField.Flags.ViewChannel]
      },
      {
        id: interaction.user.id,
        allow: [
          PermissionsBitField.Flags.ViewChannel,
          PermissionsBitField.Flags.SendMessages,
          PermissionsBitField.Flags.ReadMessageHistory,
          PermissionsBitField.Flags.AttachFiles
        ]
      }
    ];

    if (staffRoleId && isSnowflake(staffRoleId)) {
      permissionOverwrites.push({
        id: staffRoleId,
        allow: [
          PermissionsBitField.Flags.ViewChannel,
          PermissionsBitField.Flags.SendMessages,
          PermissionsBitField.Flags.ReadMessageHistory,
          PermissionsBitField.Flags.AttachFiles
        ]
      });
    }

    if (adminRoleId && isSnowflake(adminRoleId)) {
      permissionOverwrites.push({
        id: adminRoleId,
        allow: [
          PermissionsBitField.Flags.ViewChannel,
          PermissionsBitField.Flags.SendMessages,
          PermissionsBitField.Flags.ReadMessageHistory,
          PermissionsBitField.Flags.AttachFiles
        ]
      });
    }

    try {
      const ticketChannel = await interaction.guild.channels.create({
        name: `ticket-${interaction.user.username}`,
        type: ChannelType.GuildText,
        parent: categoryId || null,
        topic: interaction.user.id,
        permissionOverwrites: permissionOverwrites
      });

      const welcomeEmbed = new EmbedBuilder()
        .setTitle(`تذكرة جديدة - ${sector.name}`)
        .setDescription(`مرحباً بك ${interaction.user} في تذكرتك.\nسيقوم فريق الدعم بالرد عليك في أقرب وقت ممكن.`)
        .setColor((botConfig.app?.branding?.primaryColor || "#c5a059") as ColorResolvable);

      if (sector.ticketLogoUrl) {
        welcomeEmbed.setThumbnail(sector.ticketLogoUrl);
      } else if (botConfig.app?.branding?.logo) {
        welcomeEmbed.setThumbnail(botConfig.app.branding.logo);
      }

      if (sector.ticketBannerUrl) {
        welcomeEmbed.setImage(sector.ticketBannerUrl);
      } else if (botConfig.app?.branding?.banner) {
        welcomeEmbed.setImage(botConfig.app.branding.banner);
      }

      if (botConfig.app?.branding?.footer) {
        welcomeEmbed.setFooter({ text: botConfig.app.branding.footer });
      }

      if (answers && answers.length > 0) {
        answers.forEach((ans: any) => {
          welcomeEmbed.addFields({ name: ans.label, value: ans.value || "لا توجد إجابة", inline: false });
        });
      }

      const actionRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`close_ticket:${interaction.user.id}`)
          .setLabel("إغلاق التذكرة")
          .setEmoji("🔒")
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId(`claim_ticket`)
          .setLabel("استلام التذكرة")
          .setEmoji("🙋‍♂️")
          .setStyle(ButtonStyle.Success)
      );

      const mentionStr = `${interaction.user} ${staffRoleId ? `<@&${staffRoleId}>` : ""}`;
      await ticketChannel.send({
        content: mentionStr,
        embeds: [welcomeEmbed],
        components: [actionRow]
      });

      const successEmbed = new EmbedBuilder()
        .setDescription(`✅ تم إنشاء تذكرتك بنجاح: ${ticketChannel}`)
        .setColor("#10B981");

      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ embeds: [successEmbed] }).catch(() => null);
      } else {
        await interaction.reply({ embeds: [successEmbed], ephemeral: true }).catch(() => null);
      }

      // Send logs if logsChannelId is configured
      const rawLogsChannelId = sector.logsChannelId || botConfig.globalDiscord?.logChannelId;
      const logsChannelId = isSnowflake(rawLogsChannelId) ? rawLogsChannelId : undefined;
      if (logsChannelId) {
        const logsChannel = await interaction.guild.channels.fetch(logsChannelId).catch(() => null);
        if (logsChannel && logsChannel.isTextBased()) {
          const logEmbed = new EmbedBuilder()
            .setTitle("📝 تذكرة جديدة مفتوحة")
            .setColor("#3B82F6")
            .addFields(
              { name: "العضو", value: `${interaction.user} (${interaction.user.id})`, inline: true },
              { name: "القسم", value: sector.name, inline: true },
              { name: "قناة التذكرة", value: `${ticketChannel}`, inline: true }
            )
            .setTimestamp();
          await (logsChannel as any).send({ embeds: [logEmbed] }).catch(() => null);
        }
      }

    } catch (createErr: any) {
      console.error("[TICKET_CREATE_ERR]", createErr);
      const errResponse = { embeds: [new EmbedBuilder().setDescription(`❌ فشل إنشاء قناة التذكرة. يرجى التحقق من صلاحيات البوت والـ Category. الخطأ: ${createErr.message}`).setColor("#EF4444")] };
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply(errResponse).catch(() => null);
      } else {
        await interaction.reply({ ...errResponse, ephemeral: true }).catch(() => null);
      }
    }
  }

  // --- Interaction Logic ---
  async function handleInteraction(interaction: any, instanceId: string) {
    const instance = botConfig.instances.find((i: any) => i.id === instanceId);
    if (!instance) return;

    const dashboardUrl = process.env.APP_URL || 'https://rs-team-noman-production.up.railway.app';

    if (interaction.isChatInputCommand()) {
      if (!interaction.guild) {
        const cmdName = interaction.commandName;

        if (cmdName === 'dashboard') {
          const embed = new EmbedBuilder()
            .setTitle('🔗 لوحة التحكم')
            .setDescription(`[افتح لوحة التحكم](${dashboardUrl}/dashboard)\n\nاستخدم هذا الرابط للدخول إلى لوحة التحكم الخاصة بك.`)
            .setColor((botConfig.app?.branding?.primaryColor || '#c5a059') as ColorResolvable)
            .setFooter({ text: botConfig.app?.branding?.footer || 'RS TEAM System' });
          return interaction.reply({ embeds: [embed] }).catch(() => null);
        }

        if (cmdName === 'change_token') {
          const modal = new ModalBuilder()
            .setCustomId('change_token_modal')
            .setTitle('تغيير التوكن');
          const input = new TextInputBuilder()
            .setCustomId('new_token')
            .setLabel('التوكن الجديد')
            .setPlaceholder('الصق توكن البوت الجديد هنا...')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);
          const row = new ActionRowBuilder<TextInputBuilder>().addComponents(input);
          modal.addComponents(row);
          return interaction.showModal(modal).catch(() => null);
        }

        if (cmdName === 'bot_status') {
          const isRunning = botClients.has(instanceId) && botClients.get(instanceId)?.isReady();
          const embed = new EmbedBuilder()
            .setTitle('📊 حالة البوت')
            .setDescription(`**الاسم:** ${instance.name}\n**الحالة:** ${isRunning ? '🟢 متصل' : '🔴 متوقف'}\n**المالك:** <@${instance.ownerId || 'غير معروف'}>`)
            .setColor(isRunning ? '#10B981' : '#EF4444')
            .setFooter({ text: botConfig.app?.branding?.footer || 'RS TEAM System' });
          return interaction.reply({ embeds: [embed] }).catch(() => null);
        }

        if (cmdName === 'stop') {
          if (interaction.user.id !== instance.ownerId) {
            return interaction.reply({ content: '❌ أنت لست مالك البوت.', ephemeral: true }).catch(() => null);
          }
          const client = botClients.get(instanceId);
          if (client) {
            await client.destroy().catch(() => null);
            botClients.delete(instanceId);
            instance.status = "متوقف";
            saveConfig();
          }
          return interaction.reply({ embeds: [new EmbedBuilder().setTitle('⏹️ تم إيقاف البوت').setDescription('تم إيقاف بوتك بنجاح.').setColor('#EF4444')] }).catch(() => null);
        }

        if (cmdName === 'help') {
          const embed = new EmbedBuilder()
            .setTitle('📖 قائمة الأوامر')
            .setDescription('**/dashboard** - رابط لوحة التحكم\n**/change_token** - تغيير توكن البوت\n**/bot_status** - حالة البوت\n**/stop** - إيقاف البوت\n**/help** - هذه القائمة')
            .setColor((botConfig.app?.branding?.primaryColor || '#c5a059') as ColorResolvable)
            .setFooter({ text: botConfig.app?.branding?.footer || 'RS TEAM System' });
          return interaction.reply({ embeds: [embed] }).catch(() => null);
        }

        return;
      }
      return;
    }

    try {
      // Check for allowed role restriction if opening a ticket
      const isOpeningTicket = (interaction.type === InteractionType.ModalSubmit && interaction.customId.startsWith('ticket_modal:')) ||
                              (interaction.isButton() && interaction.customId.startsWith('ticket_btn:'));

      if (isOpeningTicket && instance.ownerId && isSnowflake(instance.ownerId)) {
        if (interaction.user.id !== instance.ownerId) {
          const errEmbed = new EmbedBuilder()
            .setTitle("🔒 الوصول مقتصر على مالك البوت")
            .setDescription(`عذراً، هذا البوت مخصص لمالكه فقط ولا يمكن لغيره فتح تذاكر من خلاله.`)
            .setColor("#EF4444");
          return interaction.reply({ embeds: [errEmbed], ephemeral: true }).catch(() => null);
        }
      }

      if (isOpeningTicket && instance.allowedRoleId && isSnowflake(instance.allowedRoleId)) {
        const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
        if (!member || !member.roles.cache.has(instance.allowedRoleId)) {
          const role = await interaction.guild.roles.fetch(instance.allowedRoleId).catch(() => null);
          const roleMention = role ? `<@&${role.id}>` : "الرتبة المعينة للبوت";
          const errEmbed = new EmbedBuilder()
            .setTitle("🔒 رتبة مطلوبة للوصول")
            .setDescription(`عذراً، يجب أن تمتلك رتبة ${roleMention} لتتمكن من استخدام هذا البوت وفتح التذاكر.`)
            .setColor("#EF4444");
          return interaction.reply({ embeds: [errEmbed], ephemeral: true }).catch(() => null);
        }
      }

      if (interaction.type === InteractionType.ModalSubmit) {
        if (interaction.customId === 'change_token_modal') {
          const newToken = interaction.fields.getTextInputValue('new_token');
          instance.token = newToken;
          saveConfig();

          if (botClients.has(instanceId)) {
            await botClients.get(instanceId)?.destroy().catch(() => null);
            botClients.delete(instanceId);
          }

          await startBotInstance(instanceId);

          const embed = new EmbedBuilder()
            .setTitle('✅ تم تغيير التوكن')
            .setDescription('تم تحديث توكن البوت وإعادة تشغيله بنجاح!')
            .setColor('#10B981');
          return interaction.reply({ embeds: [embed] }).catch(() => null);
        }

        if (interaction.customId.startsWith('ticket_modal:')) {
          const sectorId = interaction.customId.split(':')[1];
          let sector: any = null;
          for (const panel of instance.panels) {
            sector = panel.sectors.find((s: any) => s.id === sectorId);
            if (sector) break;
          }
          if (!sector) return;

          await interaction.deferReply({ ephemeral: true });

          // Gather answers
          const answers: any[] = [];
          sector.questions.forEach((q: any, idx: number) => {
            const val = interaction.fields.getTextInputValue(`q_${idx}`);
            answers.push({ label: q.label, value: val });
          });

          await createTicket(interaction, sector, answers, instance);
        }

        if (interaction.customId === 'start_bot_modal') {
          const token = interaction.fields.getTextInputValue('bot_token');
          const userId = interaction.fields.getTextInputValue('user_id');

          if (!isSnowflake(userId)) {
            return interaction.reply({
              embeds: [new EmbedBuilder()
                .setTitle('❌ معرف غير صالح')
                .setDescription('يجب أن يكون معرف ديسكورد رقماً مكوناً من 17-21 خاماً.')
                .setColor('#EF4444')
              ],
              ephemeral: true
            });
          }

          await interaction.deferReply({ ephemeral: true });

          const existingInstance = botConfig.instances.find((i: any) => i.ownerId === userId);
          if (existingInstance) {
            existingInstance.token = token;
            saveConfig();

            if (botClients.has(existingInstance.id)) {
              await botClients.get(existingInstance.id)?.destroy().catch(() => null);
              botClients.delete(existingInstance.id);
            }

            await startBotInstance(existingInstance.id);

            try {
              const dmUser = await interaction.client.users.fetch(userId);
              const dashboardUrl = process.env.APP_URL || 'https://rs-team-noman-production.up.railway.app';

              const dmEmbed = new EmbedBuilder()
                .setTitle('✅ تم تحديث وتشغيل البوت بنجاح!')
                .setDescription(`تم تحديث توكن بوتك وتشغيله بنجاح!\n\n🔗 رابط لوحة التحكم: [اضغط هنا](${dashboardUrl}/dashboard)\n\nاستخدم هذا الرابط للدخول إلى لوحة التحكم الخاصة بك.`)
                .setColor('#10B981')
                .setTimestamp();

              await dmUser.send({ embeds: [dmEmbed] });
            } catch (err) {
              console.error('Failed to DM user:', err);
            }

            try {
              const subscriberRoleId = botConfig.accessControl?.subscriberRoleId;
              if (subscriberRoleId && isSnowflake(subscriberRoleId) && interaction.guild) {
                const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
                if (member) {
                  await member.roles.add(subscriberRoleId).catch(() => null);
                }
              }
            } catch {}

            return interaction.editReply({
              embeds: [new EmbedBuilder()
                .setTitle('✅ تم التحديث والتشغيل!')
                .setDescription('تم تحديث توكن بوتك وتشغيله بنجاح! تحقق من الرسائل الخاصة (DM).')
                .setColor('#10B981')
              ]
            });
          }

          const instanceId = `inst-${Date.now()}`;
          const newInstance = {
            id: instanceId,
            name: `بوت ${interaction.user.username}`,
            token: token,
            status: "متوقف",
            panels: [],
            ownerId: userId,
            systemEmbeds: {
              alreadyHasTicket: { title: "❌ لديك تذكرة مفتوحة", description: "أغلق تذكرتك الحالية أولاً", color: "#FF0000" },
              ticketWarning: { title: "⚠️ تنبيه رسمي", description: "تم تنبيهك في {channel}\nالسبب: {reason}", color: "#FFA500" }
            }
          };

          botConfig.instances.push(newInstance);
          saveConfig();

          await startBotInstance(instanceId);

          try {
            const dmUser = await interaction.client.users.fetch(userId);
            const dashboardUrl = process.env.APP_URL || 'https://rs-team-noman-production.up.railway.app';

            const dmEmbed = new EmbedBuilder()
              .setTitle('✅ تم تشغيل البوت بنجاح!')
              .setDescription(`تم تشغيل بوتك بنجاح!\n\n🔗 رابط لوحة التحكم: [اضغط هنا](${dashboardUrl}/dashboard)\n\nاستخدم هذا الرابط للدخول إلى لوحة التحكم الخاصة بك.`)
              .setColor('#10B981')
              .setTimestamp();

            await dmUser.send({ embeds: [dmEmbed] });
          } catch (err) {
            console.error('Failed to DM user:', err);
          }

          try {
            const subscriberRoleId = botConfig.accessControl?.subscriberRoleId;
            if (subscriberRoleId && isSnowflake(subscriberRoleId) && interaction.guild) {
              const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
              if (member) {
                await member.roles.add(subscriberRoleId).catch(() => null);
              }
            }
          } catch {}

          await interaction.editReply({
            embeds: [new EmbedBuilder()
              .setTitle('✅ تم التشغيل بنجاح!')
              .setDescription('تم تشغيل بوتك بنجاح! تحقق من الرسائل الخاصة (DM) للحصول على رابط لوحة التحكم.')
              .setColor('#10B981')
            ]
          });
        }
      }

      if (interaction.isButton()) {
        const customId = interaction.customId;

        if (customId.startsWith('ticket_btn:')) {
          const sectorId = customId.split(':')[1];
          let sector: any = null;
          for (const panel of instance.panels) {
            sector = panel.sectors.find((s: any) => s.id === sectorId);
            if (sector) break;
          }
          if (!sector) return;

          // If there are questions, show modal
          if (sector.questions && sector.questions.length > 0) {
            const modal = new ModalBuilder()
              .setCustomId(`ticket_modal:${sectorId}`)
              .setTitle(sector.name.substring(0, 45));

            const rows: any[] = [];
            sector.questions.forEach((q: any, qIdx: number) => {
              const textInput = new TextInputBuilder()
                .setCustomId(`q_${qIdx}`)
                .setLabel(q.label.substring(0, 45))
                .setPlaceholder(q.placeholder || "")
                .setStyle(q.isLong ? TextInputStyle.Paragraph : TextInputStyle.Short)
                .setRequired(true);
              
              const row = new ActionRowBuilder().addComponents(textInput);
              rows.push(row);
            });

            modal.addComponents(rows);
            await interaction.showModal(modal);
          } else {
            // Otherwise immediately create
            await createTicket(interaction, sector, [], instance);
          }
        }

        else if (customId.startsWith('close_ticket:')) {
          await interaction.reply({ content: "🔒 سيتم إغلاق وحذف هذه التذكرة خلال 5 ثوانٍ...", fetchReply: true }).catch(() => null);
          
          let rawLogsChannelId = botConfig.globalDiscord?.logChannelId;
          const channelTopic = interaction.channel.topic;
          if (channelTopic) {
            let sectorName = "عام";
            for (const inst of botConfig.instances) {
              for (const p of inst.panels) {
                for (const s of p.sectors) {
                  if (interaction.channel.parentId === s.categoryId) {
                     rawLogsChannelId = s.logsChannelId || rawLogsChannelId;
                     sectorName = s.name;
                  }
                }
              }
            }

            const logsChannelId = isSnowflake(rawLogsChannelId) ? rawLogsChannelId : undefined;
            if (logsChannelId) {
              const logsChannel = await interaction.guild.channels.fetch(logsChannelId).catch(() => null);
              if (logsChannel && logsChannel.isTextBased()) {
                const logEmbed = new EmbedBuilder()
                  .setTitle("🔒 تذكرة مغلقة")
                  .setColor("#EF4444")
                  .addFields(
                    { name: "صاحب التذكرة", value: `<@${channelTopic}> (${channelTopic})`, inline: true },
                    { name: "القسم", value: sectorName, inline: true },
                    { name: "تم الإغلاق بواسطة", value: `${interaction.user} (${interaction.user.id})`, inline: true }
                  )
                  .setTimestamp();
                await (logsChannel as any).send({ embeds: [logEmbed] }).catch(() => null);
              }
            }
          }

          setTimeout(async () => {
            await interaction.channel.delete().catch(() => null);
          }, 5000);
        }

        else if (customId === 'claim_ticket') {
          await interaction.reply({ content: `🙋‍♂️ تم استلام التذكرة من قبل ${interaction.user}`, allowedMentions: { parse: [] } }).catch(() => null);
          const originalMessage = interaction.message;
          const updatedComponents = originalMessage.components.map((row: any) => {
            const newRow = ActionRowBuilder.from(row);
            newRow.components.forEach((comp: any) => {
              if (comp.data.custom_id === 'claim_ticket') {
                comp.setDisabled(true);
                comp.setLabel(`مستلمة من ${interaction.user.username}`);
              }
            });
            return newRow;
          });
          await originalMessage.edit({ components: updatedComponents }).catch(() => null);
        }

        else if (customId === 'start_bot_btn') {
          const existingUserInstance = botConfig.instances.find((i: any) => i.ownerId === interaction.user.id);
          if (existingUserInstance && botClients.has(existingUserInstance.id)) {
            return interaction.reply({
              embeds: [new EmbedBuilder()
                .setTitle('⚠️ لديك بوت شغال بالفعل')
                .setDescription('لا يمكنك تشغيل بوت آخر. لديك بوت يعمل حالياً.\nأوقف بوتك الحالي أولاً من لوحة التحكم.')
                .setColor('#F59E0B')
              ],
              ephemeral: true
            }).catch(() => null);
          }

          const modal = new ModalBuilder()
            .setCustomId('start_bot_modal')
            .setTitle('تشغيل البوت');

          const tokenInput = new TextInputBuilder()
            .setCustomId('bot_token')
            .setLabel('توكن البوت (Bot Token)')
            .setPlaceholder('أدخل توكن البوت هنا...')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

          const userIdInput = new TextInputBuilder()
            .setCustomId('user_id')
            .setLabel('معرف ديسكورد (User ID)')
            .setPlaceholder('مثال: 412345678901234567')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

          const modalRow1 = new ActionRowBuilder<TextInputBuilder>().addComponents(tokenInput);
          const modalRow2 = new ActionRowBuilder<TextInputBuilder>().addComponents(userIdInput);

          modal.addComponents(modalRow1, modalRow2);
          await interaction.showModal(modal);
        }
      }
    } catch (err) {
      console.error("Interaction Error:", err);
    }
  }

  // API Routes
  apiRouter.get("/config", (req, res) => res.json(botConfig));

  apiRouter.get("/auth/discord/url", (req, res) => {
    const clientId = process.env.DISCORD_CLIENT_ID;
    if (!clientId) {
      return res.status(500).json({ error: "لم يتم تكوين Discord Client ID على الخادم بعد." });
    }
    const proto = req.headers['x-forwarded-proto'] || req.protocol;
    const clientOrigin = req.query.origin || process.env.APP_URL || `${proto}://${req.get('host')}`;
    const redirectUri = `${clientOrigin}/api/auth/discord/callback`;
    
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "identify",
      state: String(clientOrigin)
    });
    
    const authUrl = `https://discord.com/oauth2/authorize?${params.toString()}`;
    res.json({ url: authUrl });
  });

  apiRouter.get("/auth/discord/callback", async (req, res) => {
    const { code, state } = req.query;
    if (!code) {
      return res.send(`
        <html>
          <body style="background: #09090b; color: #ef4444; font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; text-align: center;">
            <div style="max-width: 400px; padding: 20px;">
              <div style="font-size: 50px; margin-bottom: 15px;">❌</div>
              <h2 style="color: white; margin-bottom: 10px;">فشل تسجيل الدخول</h2>
              <p style="color: #a1a1aa; line-height: 1.6; margin-bottom: 20px;">رمز التحقق مفقود من ديسكورد.</p>
              <button onclick="window.close()" style="background: #c5a059; color: black; border: none; padding: 12px 24px; border-radius: 12px; font-weight: bold; cursor: pointer; transition: all 0.2s;">إغلاق النافذة</button>
            </div>
          </body>
        </html>
      `);
    }

    const clientId = process.env.DISCORD_CLIENT_ID;
    const clientSecret = process.env.DISCORD_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      return res.send(`
        <html>
          <body style="background: #09090b; color: #ef4444; font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; text-align: center;">
            <div style="max-width: 400px; padding: 20px;">
              <div style="font-size: 50px; margin-bottom: 15px;">❌</div>
              <h2 style="color: white; margin-bottom: 10px;">خطأ في إعدادات الخادم</h2>
              <p style="color: #a1a1aa; line-height: 1.6; margin-bottom: 20px;">لم يتم ضبط معرف العميل أو السر الخاص بديسكورد (DISCORD_CLIENT_ID / DISCORD_CLIENT_SECRET) في البيئة.</p>
              <button onclick="window.close()" style="background: #c5a059; color: black; border: none; padding: 12px 24px; border-radius: 12px; font-weight: bold; cursor: pointer; transition: all 0.2s;">إغلاق النافذة</button>
            </div>
          </body>
        </html>
      `);
    }

    try {
      const proto = req.headers['x-forwarded-proto'] || req.protocol;
      const clientOrigin = state && state !== "none" ? String(state) : (process.env.APP_URL || `${proto}://${req.get('host')}`);
      const redirectUri = `${clientOrigin}/api/auth/discord/callback`;

      const tokenResponse = await fetch("https://discord.com/api/oauth2/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: "authorization_code",
          code: String(code),
          redirect_uri: redirectUri,
        }).toString(),
      });

      if (!tokenResponse.ok) {
        const errText = await tokenResponse.text();
        console.error("Failed to exchange code for token:", errText);
        throw new Error("فشل تبادل رمز التحقق مع ديسكورد.");
      }

      const tokenData = await tokenResponse.json() as any;
      const accessToken = tokenData.access_token;

      // Fetch user profile
      const userResponse = await fetch("https://discord.com/api/users/@me", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!userResponse.ok) {
        throw new Error("فشل جلب بيانات الحساب من ديسكورد.");
      }

      const userData = await userResponse.json() as any;
      const userId = userData.id;
      const username = userData.username;
      const avatarHash = userData.avatar;
      const avatarUrl = avatarHash 
        ? `https://cdn.discordapp.com/avatars/${userId}/${avatarHash}.png?size=128`
        : `https://cdn.discordapp.com/embed/avatars/${Number(userId) % 5}.png`;

      const ac = botConfig.accessControl || {};
      const adminRoleId = ac.adminRoleId || "";
      const staffRoleId = ac.staffRoleId || "";
      const subscriberRoleId = ac.subscriberRoleId || "";

      let detectedRole: string = "none";
      let memberRoles: string[] = [];

      for (const [instanceId, client] of botClients.entries()) {
        if (client.isReady()) {
          const gId = botConfig.globalDiscord?.guildId;
          if (gId && isSnowflake(gId)) {
            const guild = await client.guilds.fetch(gId).catch(() => null);
            if (guild) {
              const member = await guild.members.fetch(userId).catch(() => null);
              if (member) {
                memberRoles = member.roles.cache.map(r => r.id);
                if (adminRoleId && isSnowflake(adminRoleId) && member.roles.cache.has(adminRoleId)) {
                  detectedRole = "admin";
                  break;
                }
                if (staffRoleId && isSnowflake(staffRoleId) && member.roles.cache.has(staffRoleId)) {
                  detectedRole = "staff";
                  break;
                }
                if (subscriberRoleId && isSnowflake(subscriberRoleId) && member.roles.cache.has(subscriberRoleId)) {
                  detectedRole = "subscriber";
                  break;
                }
              }
            }
          }
        }
      }

      const minRole = ac.minRoleToAccess || "subscriber";
      const roleHierarchy: Record<string, number> = { admin: 3, staff: 2, subscriber: 1, none: 0 };
      const hasAccess = roleHierarchy[detectedRole] >= roleHierarchy[minRole];

      (req as any).session.user = {
        id: userId,
        username,
        avatar: avatarUrl,
        role: detectedRole,
        memberRoles
      };

      if (hasAccess) {
        return res.send(`
          <html>
            <body style="background: #09090b; color: #10b981; font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; text-align: center;">
              <div>
                <div style="font-size: 50px; margin-bottom: 15px;">✔️</div>
                <h2 style="color: white; margin-bottom: 10px;">تم التحقق بنجاح!</h2>
                <p style="color: #a1a1aa; margin-bottom: 20px;">أهلاً بك ${username}، الرتبة: ${detectedRole === 'admin' ? '👑 مدير' : detectedRole === 'staff' ? '🛡️ طاقم' : '👤 مشترك'}</p>
                <script>
                  if (window.opener) {
                    window.opener.postMessage({
                      type: 'DISCORD_AUTH_SUCCESS',
                      user: {
                        id: ${JSON.stringify(userId)},
                        username: ${JSON.stringify(username)},
                        avatar: ${JSON.stringify(avatarUrl)},
                        role: ${JSON.stringify(detectedRole)},
                        memberRoles: ${JSON.stringify(memberRoles)}
                      }
                    }, '*');
                    window.close();
                  } else {
                    window.location.href = '/dashboard';
                  }
                </script>
              </div>
            </body>
          </html>
        `);
      } else {
        return res.send(`
          <html>
            <body style="background: #09090b; color: #ef4444; font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; text-align: center;">
              <div style="max-width: 400px; padding: 20px;">
                <div style="font-size: 50px; margin-bottom: 15px;">❌</div>
                <h2 style="color: white; margin-bottom: 10px;">صلاحيات غير كافية</h2>
                <p style="color: #a1a1aa; line-height: 1.6; margin-bottom: 20px;">
                  عذراً <strong>${username}</strong>، رتبتك الحالية ("<strong>${detectedRole === 'admin' ? 'مدير' : detectedRole === 'staff' ? 'طاقم' : detectedRole === 'subscriber' ? 'مشترك' : 'غير معروف'}</strong>) لا تكفي للدخول. الرتبة المطلوبة: "${minRole === 'admin' ? 'مدير' : minRole === 'staff' ? 'طاقم' : 'مشترك'}".
                </p>
                <button onclick="window.close()" style="background: #c5a059; color: black; border: none; padding: 12px 24px; border-radius: 12px; font-weight: bold; cursor: pointer; transition: all 0.2s;">إغلاق النافذة</button>
              </div>
            </body>
          </html>
        `);
      }

    } catch (err: any) {
      console.error("Error in discord oauth callback:", err);
      return res.send(`
        <html>
          <body style="background: #09090b; color: #ef4444; font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; text-align: center;">
            <div style="max-width: 400px; padding: 20px;">
              <div style="font-size: 50px; margin-bottom: 15px;">❌</div>
              <h2>حدث خطأ أثناء التحقق</h2>
              <p style="color: #a1a1aa; line-height: 1.6; margin-bottom: 20px;">${err.message || "فشل الاتصال بخوادم ديسكورد للتحقق من الرتبة."}</p>
              <button onclick="window.close()" style="background: #c5a059; color: black; border: none; padding: 12px 24px; border-radius: 12px; font-weight: bold; cursor: pointer; transition: all 0.2s;">إغلاق النافذة</button>
            </div>
          </body>
        </html>
      `);
    }
  });

  apiRouter.get("/auth/me", async (req, res) => {
    const session = (req as any).session;
    if (!session?.user) {
      return res.json({ authenticated: false });
    }

    const ac = botConfig.accessControl || {};
    const adminRoleId = ac.adminRoleId || "";
    const staffRoleId = ac.staffRoleId || "";
    const subscriberRoleId = ac.subscriberRoleId || "";
    const minRole = ac.minRoleToAccess || "subscriber";
    const roleHierarchy: Record<string, number> = { admin: 3, staff: 2, subscriber: 1, none: 0 };

    let detectedRole: string = "none";
    let memberRoles: string[] = [];

    for (const [instanceId, client] of botClients.entries()) {
      if (client.isReady()) {
        const gId = botConfig.globalDiscord?.guildId;
        if (gId && isSnowflake(gId)) {
          const guild = await client.guilds.fetch(gId).catch(() => null);
          if (guild) {
            const member = await guild.members.fetch(session.user.id).catch(() => null);
            if (member) {
              memberRoles = member.roles.cache.map(r => r.id);
              if (adminRoleId && isSnowflake(adminRoleId) && member.roles.cache.has(adminRoleId)) {
                detectedRole = "admin";
                break;
              }
              if (staffRoleId && isSnowflake(staffRoleId) && member.roles.cache.has(staffRoleId)) {
                detectedRole = "staff";
                break;
              }
              if (subscriberRoleId && isSnowflake(subscriberRoleId) && member.roles.cache.has(subscriberRoleId)) {
                detectedRole = "subscriber";
                break;
              }
            }
          }
        }
      }
    }

    const hasAccess = roleHierarchy[detectedRole] >= roleHierarchy[minRole];

    if (!hasAccess) {
      session.destroy(() => {});
      return res.json({ authenticated: false });
    }

    session.user.role = detectedRole;
    session.user.memberRoles = memberRoles;
    res.json({ authenticated: true, user: session.user });
  });

  apiRouter.get("/auth/logout", (req, res) => {
    const session = (req as any).session;
    if (session) {
      session.destroy(() => {
        res.json({ success: true });
      });
    } else {
      res.json({ success: true });
    }
  });

  apiRouter.get("/discord/data", async (req, res) => {
    const { instanceId, guildId } = req.query;
    const client = botClients.get(instanceId as string);
    if (!client?.isReady()) return res.status(400).json({ error: "البوت غير متصل" });

    try {
      let gId = (guildId as string) || botConfig.globalDiscord?.guildId;
      
      if (!isSnowflake(gId)) {
        gId = undefined;
      }

      if (!gId) {
        const cachedGuild = client.guilds.cache.first();
        if (cachedGuild) {
          gId = cachedGuild.id;
        } else {
          const guilds = await client.guilds.fetch().catch(() => null);
          gId = guilds ? (guilds.first() as any)?.id : undefined;
        }

        // Auto-save the found guildId to configuration if the current one is placeholder or empty
        if (gId && isSnowflake(gId) && (!botConfig.globalDiscord?.guildId || botConfig.globalDiscord.guildId === 'YOUR_GUILD_ID_HERE')) {
          if (!botConfig.globalDiscord) {
            botConfig.globalDiscord = {
              guildId: gId,
              adminRoleId: '',
              staffRoleId: '',
              logChannelId: '',
              ticketCategoryId: '',
              transcriptChannelId: ''
            };
          } else {
            botConfig.globalDiscord.guildId = gId;
          }
          saveConfig();
        }
      }

      if (!gId || !isSnowflake(gId)) {
        return res.json({ channels: [], roles: [] });
      }

      const guild = await client.guilds.fetch(gId).catch(() => null);
      if (!guild) {
        // Fallback: try fetching the first guild the bot is in
        const cachedGuild = client.guilds.cache.first();
        let fallbackGuild = cachedGuild ? await client.guilds.fetch(cachedGuild.id).catch(() => null) : null;
        if (!fallbackGuild) {
          const guilds = await client.guilds.fetch().catch(() => null);
          const fallbackGId = guilds ? (guilds.first() as any)?.id : undefined;
          if (fallbackGId && isSnowflake(fallbackGId)) {
            fallbackGuild = await client.guilds.fetch(fallbackGId).catch(() => null);
          }
        }
        
        if (fallbackGuild) {
          const channels = await fallbackGuild.channels.fetch().catch(() => null);
          const roles = await fallbackGuild.roles.fetch().catch(() => null);
          return res.json({
            channels: channels ? channels.filter(c => c && (c.type === ChannelType.GuildText || c.type === ChannelType.GuildCategory)).map(c => ({ id: c!.id, name: c!.name, type: c!.type })) : [],
            roles: roles ? roles.map(r => ({ id: r.id, name: r.name })) : []
          });
        }
        return res.json({ channels: [], roles: [] });
      }

      const channels = await guild.channels.fetch().catch(() => null);
      const roles = await guild.roles.fetch().catch(() => null);

      res.json({
        channels: channels ? channels.filter(c => c && (c.type === ChannelType.GuildText || c.type === ChannelType.GuildCategory)).map(c => ({ id: c!.id, name: c!.name, type: c!.type })) : [],
        roles: roles ? roles.map(r => ({ id: r.id, name: r.name })) : []
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  apiRouter.post("/deploy", async (req, res) => {
    const { instanceId, panelId } = req.body;
    
    const instance = botConfig.instances.find(i => i.id === instanceId);
    if (!instance) {
      return res.status(404).json({ error: "لم يتم العثور على البوت" });
    }

    let client = botClients.get(instanceId);
    if (!client || !client.isReady()) {
      if (instance.token && instance.token.trim() !== "" && instance.token !== "YOUR_DISCORD_BOT_TOKEN_HERE") {
        console.log(`[DEPLOY_AUTO_START] Starting offline bot instance dynamically for deploy: ${instance.name}`);
        await startBotInstance(instanceId).catch(() => null);
        
        // Wait up to 4 seconds for ready state
        for (let i = 0; i < 8; i++) {
          client = botClients.get(instanceId);
          if (client?.isReady()) break;
          await new Promise(r => setTimeout(r, 500));
        }
      }
    }

    client = botClients.get(instanceId);
    if (!client || !client.isReady()) {
      return res.status(400).json({ error: "البوت غير متصل. يرجى تشغيل البوت أولاً ليتسنى له إرسال اللوحة." });
    }

    const panel = instance.panels.find(p => p.id === panelId);
    if (!panel) {
      return res.status(404).json({ error: "اللوحة المطلوبة غير موجودة" });
    }

    let targetChannelId = panel.channelId;
    if (!targetChannelId) {
      const firstGuild = client.guilds.cache.first();
      if (firstGuild) {
        const channels = await firstGuild.channels.fetch().catch(() => null);
        if (channels) {
          const textChannel = channels.find(c => c && c.type === ChannelType.GuildText);
          if (textChannel) {
            targetChannelId = textChannel.id;
            panel.channelId = targetChannelId;
            saveConfig();
          }
        }
      }
    }

    if (!targetChannelId) {
      return res.status(400).json({ error: "يرجى تحديد قناة لإرسال اللوحة إليها في إعدادات اللوحة وحفظ التعديلات أولاً." });
    }

    try {
      let channel = await client.channels.fetch(targetChannelId).catch(() => null);
      if (!channel || !channel.isTextBased()) {
        const firstGuild = client.guilds.cache.first();
        if (firstGuild) {
          const channels = await firstGuild.channels.fetch().catch(() => null);
          if (channels) {
            const textChannel = channels.find(c => c && c.type === ChannelType.GuildText);
            if (textChannel) {
              targetChannelId = textChannel.id;
              panel.channelId = targetChannelId;
              saveConfig();
              channel = textChannel;
            }
          }
        }
      }

      if (!channel || !channel.isTextBased()) {
        return res.status(400).json({ error: "القناة المحددة غير موجودة، أو أن البوت لا يمتلك الصلاحية لرؤيتها، أو أنها ليست قناة كتابية صالحة." });
      }

      const embed = new EmbedBuilder()
        .setTitle(panel.name || "نظام التذاكر")
        .setDescription(panel.message || "يرجى الضغط على الزر المقابل لطلب الدعم الفني")
        .setColor((botConfig.app?.branding?.primaryColor || "#c5a059") as ColorResolvable);

      if (panel.logoUrl && panel.logoUrl.trim() !== "") {
        embed.setThumbnail(panel.logoUrl);
      } else if (botConfig.app?.branding?.logo) {
        embed.setThumbnail(botConfig.app.branding.logo);
      }

      if (panel.bannerUrl && panel.bannerUrl.trim() !== "") {
        embed.setImage(panel.bannerUrl);
      } else if (botConfig.app?.branding?.banner) {
        embed.setImage(botConfig.app.branding.banner);
      }

      if (botConfig.app?.branding?.footer) {
        embed.setFooter({ text: botConfig.app.branding.footer });
      }

      const rows: any[] = [];
      if (panel.sectors && panel.sectors.length > 0) {
        let currentRow = new ActionRowBuilder();
        panel.sectors.forEach((sector: any, idx: number) => {
          if (idx > 0 && idx % 5 === 0) {
            rows.push(currentRow);
            currentRow = new ActionRowBuilder();
          }
          const btn = new ButtonBuilder()
            .setCustomId(`ticket_btn:${sector.id}`)
            .setLabel(sector.name)
            .setStyle(ButtonStyle.Primary);
          if (sector.emoji) {
            btn.setEmoji(sector.emoji);
          }
          currentRow.addComponents(btn);
        });
        if (currentRow.components.length > 0) {
          rows.push(currentRow);
        }
      }

      await (channel as any).send({
        embeds: [embed],
        components: rows
      });

      res.json({ message: "تم نشر اللوحة بنجاح في القناة المحددة!" });
    } catch (err: any) {
      console.error("[DEPLOY_ERR]", err);
      res.status(500).json({ error: `فشل إرسال الرسالة إلى Discord. يرجى التأكد من أن التوكن صالح وأن البوت مضاف للسيرفر ولديه صلاحيات إرسال الرسائل ورؤية القناة. الخطأ: ${err.message}` });
    }
  });

  apiRouter.post("/deploy-run-panel", async (req, res) => {
    const { instanceId, channelId } = req.body;

    const instance = botConfig.instances.find(i => i.id === instanceId);
    if (!instance) {
      return res.status(404).json({ error: "لم يتم العثور على البوت" });
    }

    let client = botClients.get(instanceId);
    if (!client || !client.isReady()) {
      if (instance.token && instance.token.trim() !== "" && instance.token !== "YOUR_DISCORD_BOT_TOKEN_HERE") {
        await startBotInstance(instanceId).catch(() => null);
        for (let i = 0; i < 8; i++) {
          client = botClients.get(instanceId);
          if (client?.isReady()) break;
          await new Promise(r => setTimeout(r, 500));
        }
      }
    }

    client = botClients.get(instanceId);
    if (!client || !client.isReady()) {
      return res.status(400).json({ error: "البوت غير متصل. يرجى تشغيل البوت أولاً." });
    }

    if (!channelId) {
      return res.status(400).json({ error: "يرجى تحديد قناة لإرسال لوحة التشغيل." });
    }

    try {
      const channel = await client.channels.fetch(channelId);
      if (!channel || !channel.isTextBased()) {
        return res.status(400).json({ error: "القناة غير صالحة أو غير موجودة." });
      }

      const embed = new EmbedBuilder()
        .setTitle('🚀 تشغيل البوت')
        .setDescription('اضغط على الزر أدناه لتشغيل البوت الخاص بك.\n\nسيتم طلب توكن البوت ومعرف ديسكورد الخاص بك.\nبعد الإدخال، سيتم تشغيل البوت تلقائياً وإرسال رابط لوحة التحكم إليك.')
        .setColor((botConfig.app?.branding?.primaryColor || '#c5a059') as ColorResolvable)
        .setFooter({ text: botConfig.app?.branding?.footer || 'RS TEAM System' });

      if (botConfig.app?.branding?.logo) {
        embed.setThumbnail(botConfig.app.branding.logo);
      }

      const button = new ButtonBuilder()
        .setCustomId('start_bot_btn')
        .setLabel('تشغيل البوت')
        .setStyle(ButtonStyle.Success)
        .setEmoji('▶️');

      const row = new ActionRowBuilder().addComponents(button);

      await (channel as any).send({ embeds: [embed], components: [row] });

      res.json({ message: "تم إرسال لوحة التشغيل بنجاح!" });
    } catch (err: any) {
      console.error("[DEPLOY_RUN_PANEL_ERR]", err);
      res.status(500).json({ error: `فشل إرسال لوحة التشغيل: ${err.message}` });
    }
  });

  apiRouter.post("/deploy-run-webhook", async (req, res) => {
    const { webhookUrl } = req.body;

    if (!webhookUrl || !webhookUrl.includes('discord.com/api/webhooks')) {
      return res.status(400).json({ error: "رابط الويب هوك غير صالح" });
    }

    let channelId: string | null = null;
    try {
      const whResp = await fetch(webhookUrl);
      if (whResp.ok) {
        const whData: any = await whResp.json();
        channelId = whData.channel_id;
      }
    } catch {}

    let client: Client | undefined;
    for (const [, c] of botClients) {
      if (c?.isReady()) { client = c; break; }
    }

    if (!client) {
      for (const inst of botConfig.instances) {
        if (inst.token && inst.token !== "YOUR_DISCORD_BOT_TOKEN_HERE") {
          await startBotInstance(inst.id).catch(() => null);
          for (let i = 0; i < 5; i++) {
            client = botClients.get(inst.id);
            if (client?.isReady()) break;
            await new Promise(r => setTimeout(r, 1000));
          }
          if (client?.isReady()) break;
        }
      }
    }

    if (!client || !client.isReady()) {
      return res.status(400).json({ error: "لا يوجد بوت متصل. يرجى تشغيل بوت أولاً." });
    }

    if (!channelId) {
      return res.status(400).json({ error: "تعذر جلب معلومات القناة من الويب هوك." });
    }

    try {
      const channel = await client.channels.fetch(channelId);
      if (!channel || !channel.isTextBased()) {
        return res.status(400).json({ error: "القناة غير صالحة." });
      }

      const embed = new EmbedBuilder()
        .setTitle('🚀 تشغيل البوت')
        .setDescription('اضغط على الزر أدناه لتشغيل البوت الخاص بك.\n\nسيتم طلب توكن البوت ومعرف ديسكورد الخاص بك.\nبعد الإدخال، سيتم تشغيل البوت تلقائياً وإرسال رابط لوحة التحكم إليك.')
        .setColor((botConfig.app?.branding?.primaryColor || '#c5a059') as ColorResolvable)
        .setFooter({ text: botConfig.app?.branding?.footer || 'RS TEAM System' });

      if (botConfig.app?.branding?.logo) {
        embed.setThumbnail(botConfig.app.branding.logo);
      }

      const button = new ButtonBuilder()
        .setCustomId('start_bot_btn')
        .setLabel('تشغيل البوت')
        .setStyle(ButtonStyle.Success)
        .setEmoji('▶️');

      const row = new ActionRowBuilder().addComponents(button);

      await (channel as any).send({ embeds: [embed], components: [row] });

      res.json({ message: "تم إرسال لوحة التشغيل بنجاح!" });
    } catch (err: any) {
      console.error("[DEPLOY_WEBHOOK_ERR]", err);
      res.status(500).json({ error: `فشل الإرسال: ${err.message}` });
    }
  });

  apiRouter.post("/start-from-web", async (req, res) => {
    const { token, userId } = req.body;

    if (!token || !userId) {
      return res.status(400).json({ error: "يرجى ملء جميع الحقول" });
    }

    if (!isSnowflake(userId)) {
      return res.status(400).json({ error: "معرف ديسكورد غير صالح. يجب أن يكون رقماً من 17-21 خاماً." });
    }

    const existingInstance = botConfig.instances.find((i: any) => i.ownerId === userId);
    if (existingInstance) {
      existingInstance.token = token;
      saveConfig();

      if (botClients.has(existingInstance.id)) {
        await botClients.get(existingInstance.id)?.destroy().catch(() => null);
        botClients.delete(existingInstance.id);
      }

      await startBotInstance(existingInstance.id);

      const dashboardUrl = process.env.APP_URL || 'https://rs-team-noman-production.up.railway.app';
      return res.json({ success: true, dashboardUrl: `${dashboardUrl}/dashboard`, message: "تم تحديث وتشغيل البوت بنجاح!" });
    }

    const instanceId = `inst-${Date.now()}`;
    const newInstance = {
      id: instanceId,
      name: `بوت ${userId}`,
      token: token,
      status: "متوقف",
      panels: [],
      ownerId: userId,
      systemEmbeds: {
        alreadyHasTicket: { title: "❌ لديك تذكرة مفتوحة", description: "أغلق تذكرتك الحالية أولاً", color: "#FF0000" },
        ticketWarning: { title: "⚠️ تنبيه رسمي", description: "تم تنبيهك في {channel}\nالسبب: {reason}", color: "#FFA500" }
      }
    };

    botConfig.instances.push(newInstance);
    saveConfig();

    await startBotInstance(instanceId);

    const dashboardUrl = process.env.APP_URL || 'https://rs-team-noman-production.up.railway.app';
    res.json({ success: true, dashboardUrl: `${dashboardUrl}/dashboard`, message: "تم تشغيل البوت بنجاح!" });
  });

  apiRouter.post("/start", async (req, res) => {
    const { instanceId } = req.body;
    await startBotInstance(instanceId);
    res.json({ message: "تم إصدار أمر للتشغيل" });
  });

  apiRouter.post("/stop", async (req, res) => {
    const { instanceId } = req.body;
    const client = botClients.get(instanceId);
    if (client) {
      await client.destroy().catch(() => null);
      botClients.delete(instanceId);
      const instance = botConfig.instances.find(i => i.id === instanceId);
      if (instance) {
        instance.status = "متوقف";
        saveConfig();
      }
    }
    res.json({ message: "تم الإيقاف" });
  });

  apiRouter.post("/instances/add", (req, res) => {
    const { name, ownerId } = req.body;
    const newInst = {
      id: "inst-" + Date.now(),
      name: name || "بوت جديد",
      token: "",
      status: "متوقف",
      panels: [],
      ownerId: ownerId || "",
      systemEmbeds: {
        alreadyHasTicket: { title: "❌ لديك تذكرة مفتوحة", description: "أغلق تذكرتك الحالية أولاً", color: "#FF0000" },
        ticketWarning: { title: "⚠️ تنبيه رسمي", description: "تم تنبيهك في {channel}\nالسبب: {reason}", color: "#FF0000" }
      }
    };
    botConfig.instances.push(newInst);
    saveConfig();
    res.json(newInst);
  });

  apiRouter.post("/instances/delete", async (req, res) => {
    const { id, ownerId } = req.body;
    
    if (!id && !ownerId) {
      return res.status(400).json({ error: "يجب توفير معرف البوت أو معرف الشخص" });
    }

    let deletedCount = 0;
    const targetsToDelete: string[] = [];

    if (id) {
      targetsToDelete.push(String(id).trim());
    } else if (ownerId) {
      const trimmedOwnerId = String(ownerId).trim();
      const matched = botConfig.instances.filter((i: any) => i.ownerId && String(i.ownerId).trim() === trimmedOwnerId);
      matched.forEach((i: any) => {
        if (i.id) targetsToDelete.push(String(i.id).trim());
      });
    }

    if (targetsToDelete.length === 0) {
      return res.status(404).json({ error: "لا يوجد أي بوت مرتبط بالمعرف المدخل" });
    }

    for (const targetId of targetsToDelete) {
      const client = botClients.get(targetId);
      if (client) {
        await client.destroy().catch(() => null);
        botClients.delete(targetId);
      }
      const index = botConfig.instances.findIndex(i => String(i.id).trim() === targetId);
      if (index !== -1) {
        botConfig.instances.splice(index, 1);
        deletedCount++;
      }
    }

    if (deletedCount > 0) {
      saveConfig();
      return res.json({ success: true, message: `تم حذف البوت بنجاح (العدد: ${deletedCount})` });
    }

    return res.status(404).json({ error: "لم يتم العثور على البوت لحذفه" });
  });

  apiRouter.post("/instances/update", (req, res) => {
    const { id, ...otherUpdates } = req.body;
    
    // Handle instance-specific updates if ID matches
    const inst = botConfig.instances.find(i => i.id === id);
    if (inst) {
      Object.keys(otherUpdates).forEach(key => {
        inst[key] = otherUpdates[key];
      });
      saveConfig();
      return res.json({ success: true });
    }

    // Handle global updates for any top-level key in config.json
    let updatedGlobal = false;
    for (const key in otherUpdates) {
       if (key !== 'id') {
          // If the key exists in botConfig or is a recognized global key
          if (botConfig[key] !== undefined) {
             // Deep merge or replace depending on type
             if (typeof otherUpdates[key] === 'object' && !Array.isArray(otherUpdates[key])) {
                botConfig[key] = { ...botConfig[key], ...otherUpdates[key] };
             } else {
                botConfig[key] = otherUpdates[key];
             }
             updatedGlobal = true;
          }
       }
    }

    if (updatedGlobal) {
      saveConfig();
      res.json({ success: true });
    } else {
      res.status(404).json({ error: "لا يوجد بوت بهذا المعرف أو الحقول غير صالحة" });
    }
  });

  // Vite middleware
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => res.sendFile(path.join(distPath, "index.html")));
  }

  // Auto-start active bots on startup
  const envToken = process.env.DISCORD_TOKEN;
  const envGuildId = process.env.GUILD_ID;
  
  // Apply env var overrides
  if (envGuildId && (!botConfig.globalDiscord?.guildId || botConfig.globalDiscord.guildId === 'YOUR_GUILD_ID_HERE')) {
    if (!botConfig.globalDiscord) botConfig.globalDiscord = { guildId: '', adminRoleId: '', staffRoleId: '', logChannelId: '', ticketCategoryId: '', transcriptChannelId: '' };
    botConfig.globalDiscord.guildId = envGuildId;
  }
  
  // If we have an env token but no valid instance, create one
  if (envToken && envToken.trim() !== "") {
    let hasValidInstance = botConfig.instances?.some((inst: any) => inst.token && inst.token.trim() !== "" && inst.token !== "YOUR_DISCORD_BOT_TOKEN_HERE");
    
    if (!hasValidInstance) {
      const newInst = {
        id: "inst-main",
        name: "RS TEAM BOT",
        token: envToken,
        status: "متوقف",
        panels: [],
        ownerId: "",
        systemEmbeds: {
          alreadyHasTicket: { title: "❌ لديك تذكرة مفتوحة", description: "أغلق تذكرتك الحالية أولاً لفتح تذكرة جديدة.", color: "#FF0000" },
          ticketWarning: { title: "⚠️ تنبيه رسمي", description: "تم تنبيهك في {channel}\nالسبب: {reason}", color: "#FFA500" }
        }
      };
      botConfig.instances.push(newInst);
      saveConfig();
    } else {
      // Update existing instances with placeholder token to use env token
      botConfig.instances.forEach((inst: any) => {
        if (!inst.token || inst.token.trim() === "" || inst.token === "YOUR_DISCORD_BOT_TOKEN_HERE") {
          inst.token = envToken;
        }
      });
      saveConfig();
    }
  }

  botConfig.instances?.forEach((inst: any) => {
    const tokenToUse = (inst.token && inst.token.trim() !== "" && inst.token !== "YOUR_DISCORD_BOT_TOKEN_HERE") ? inst.token : envToken;
    if (tokenToUse && tokenToUse.trim() !== "") {
      if (inst.token === "YOUR_DISCORD_BOT_TOKEN_HERE" || !inst.token || inst.token.trim() === "") {
        inst.token = tokenToUse;
        saveConfig();
      }
      console.log(`[AUTO_START] Starting bot instance on startup: ${inst.name} (${inst.id})`);
      startBotInstance(inst.id).catch(err => {
         console.error(`[AUTO_START_ERROR] Failed to start active bot ${inst.id}:`, err);
      });
    }
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
